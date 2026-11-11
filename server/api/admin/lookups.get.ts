// Listas de apoio do painel: administradoras e equipe (responsáveis por chamados/visitas).
export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const db = await userDb(event)
  const [companies, staff] = await Promise.all([
    db.from('management_companies').select('id, trade_name').eq('active', true).order('trade_name').limit(1000),
    db.from('user_profiles').select('user_id, display_name, staff_memberships!inner(staff_role, active)').eq('active', true).eq('staff_memberships.active', true),
  ])
  if (companies.error) dbFail(companies.error)
  if (staff.error) dbFail(staff.error)
  return {
    companies: companies.data ?? [],
    staff: (staff.data ?? []).map(s => ({ id: s.user_id, name: s.display_name ?? 'Equipe' })),
  }
})
