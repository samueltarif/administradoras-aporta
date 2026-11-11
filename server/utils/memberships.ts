import type { H3Event } from 'h3'
import type { MembershipInput } from '#shared/schemas/users'

/** Cria/reativa ou revoga um vínculo de acesso. Executa com a sessão do proprietário (RLS). */
export async function setMembership(event: H3Event, userId: string, m: MembershipInput, active: boolean) {
  const db = await userDb(event)
  const res = m.scope === 'staff'
    ? await db.from('staff_memberships').upsert({ user_id: userId, staff_role: m.role, active })
    : m.scope === 'management'
      ? await db.from('management_memberships').upsert({ user_id: userId, management_company_id: m.target_id, member_role: m.role, active })
      : await db.from('customer_memberships').upsert({ user_id: userId, customer_id: m.target_id, member_role: m.role, active })
  if (res.error) dbFail(res.error)
}
