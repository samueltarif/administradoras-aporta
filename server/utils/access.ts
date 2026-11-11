import type { H3Event } from 'h3'
import type { AccessContext, CustomerRole, ManagementRole, StaffRole } from '#shared/types/access'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

interface Named { id: string, trade_name: string }
interface MgmtRow { member_role: ManagementRole, management_companies: Named | null }
interface CustRow { member_role: CustomerRole, customers: Named | null }

/** Lê os vínculos do usuário autenticado com o cliente da sessão (sujeito à RLS). */
export async function getAccess(event: H3Event): Promise<AccessContext | null> {
  const claims = await serverSupabaseUser(event).catch(() => null)
  const userId = typeof claims?.sub === 'string' ? claims.sub : null
  if (!userId) return null
  const client = await serverSupabaseClient(event)

  const [profile, staff, mgmt, cust] = await Promise.all([
    client.from('user_profiles').select('display_name, active').eq('user_id', userId).maybeSingle(),
    client.from('staff_memberships').select('staff_role').eq('user_id', userId).eq('active', true).maybeSingle(),
    client.from('management_memberships').select('member_role, management_companies(id, trade_name)')
      .eq('user_id', userId).eq('active', true),
    client.from('customer_memberships').select('member_role, customers(id, trade_name)')
      .eq('user_id', userId).eq('active', true),
  ])
  const failed = [profile, staff, mgmt, cust].find(r => r.error)
  if (failed?.error) {
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar seus acessos' })
  }

  // Sem tipos gerados do banco (npm run db:types), as linhas são tipadas explicitamente.
  const profileRow = profile.data as { display_name: string | null, active: boolean } | null
  const staffRow = staff.data as { staff_role: StaffRole } | null
  const active = Boolean(profileRow?.active)
  const mgmtRows = (mgmt.data ?? []) as unknown as MgmtRow[]
  const custRows = (cust.data ?? []) as unknown as CustRow[]
  return {
    userId,
    email: typeof claims?.email === 'string' ? claims.email : null,
    displayName: profileRow?.display_name ?? null,
    active,
    staffRole: active ? (staffRow?.staff_role ?? null) : null,
    managements: active
      ? mgmtRows.filter(r => r.management_companies).map(r => ({
          id: r.management_companies!.id, name: r.management_companies!.trade_name, role: r.member_role,
        }))
      : [],
    customers: active
      ? custRows.filter(r => r.customers).map(r => ({
          id: r.customers!.id, name: r.customers!.trade_name, role: r.member_role,
        }))
      : [],
  }
}

export async function requireAccess(event: H3Event): Promise<AccessContext> {
  const access = await getAccess(event)
  if (!access) throw createError({ statusCode: 401, statusMessage: 'Sessão inválida ou expirada' })
  if (!access.active) throw createError({ statusCode: 403, statusMessage: 'Usuário desativado' })
  return access
}

export async function requireStaff(event: H3Event, roles: StaffRole[] = ['owner', 'operations']) {
  const access = await requireAccess(event)
  if (!access.staffRole || !roles.includes(access.staffRole)) {
    throw createError({ statusCode: 403, statusMessage: 'Acesso restrito à equipe A Porta Móvel' })
  }
  return access
}
