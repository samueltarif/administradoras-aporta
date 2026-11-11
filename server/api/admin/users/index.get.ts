import { serverSupabaseServiceRole } from '#supabase/server'

// Usuários do portal com e-mail (Admin API, só no servidor) e vínculos (RLS do proprietário).
export default defineEventHandler(async (event) => {
  await requireStaff(event, ['owner'])
  const db = await userDb(event)
  const [profiles, staff, mgmt, cust, auth] = await Promise.all([
    db.from('user_profiles').select('user_id, display_name, active, created_at').order('display_name'),
    db.from('staff_memberships').select('user_id, staff_role, active'),
    db.from('management_memberships').select('user_id, member_role, active, management_companies(id, trade_name)'),
    db.from('customer_memberships').select('user_id, member_role, active, customers(id, trade_name)'),
    serverSupabaseServiceRole(event).auth.admin.listUsers({ perPage: 1000 }),
  ])
  for (const r of [profiles, staff, mgmt, cust]) if (r.error) dbFail(r.error)
  if (auth.error) throw createError({ statusCode: 502, statusMessage: 'Falha ao consultar o Auth' })
  const authById = new Map(auth.data.users.map(u => [u.id, u]))
  return (profiles.data ?? []).map((p) => {
    const a = authById.get(p.user_id)
    return {
      ...p,
      email: a?.email ?? null,
      last_sign_in_at: a?.last_sign_in_at ?? null,
      invited_pending: Boolean(a && !a.last_sign_in_at && a.invited_at),
      memberships: [
        ...(staff.data ?? []).filter(s => s.user_id === p.user_id).map(s => ({ scope: 'staff' as const, role: s.staff_role, active: s.active, target_id: null, target_name: 'A Porta Móvel' })),
        ...(mgmt.data ?? []).filter(s => s.user_id === p.user_id).map(s => ({ scope: 'management' as const, role: s.member_role, active: s.active, target_id: s.management_companies?.id ?? null, target_name: s.management_companies?.trade_name ?? '—' })),
        ...(cust.data ?? []).filter(s => s.user_id === p.user_id).map(s => ({ scope: 'customer' as const, role: s.member_role, active: s.active, target_id: s.customers?.id ?? null, target_name: s.customers?.trade_name ?? '—' })),
      ],
    }
  })
})
