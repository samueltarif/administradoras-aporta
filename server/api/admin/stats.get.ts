// Indicadores do painel. Contagens reais do banco, sob a RLS da equipe.
export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const db = await userDb(event)
  const head = { count: 'exact' as const, head: true }
  const [customers, unclassified, companies, assignments, openTickets, emergencies, contracts, visits] = await Promise.all([
    db.from('customers').select('id', head).eq('active', true),
    db.from('customers').select('id', head).eq('customer_kind', 'unclassified'),
    db.from('management_companies').select('id', head).eq('active', true),
    db.from('management_assignments').select('id', head).is('ended_at', null),
    db.from('tickets').select('id', head).not('status', 'in', '(resolved,closed,cancelled)'),
    db.from('tickets').select('id', head).eq('priority', 'emergency').not('status', 'in', '(resolved,closed,cancelled)'),
    db.from('service_contracts').select('id', head).eq('status', 'active'),
    db.from('technical_visits').select('id', head).eq('status', 'scheduled').gte('scheduled_for', new Date().toISOString()),
  ])
  const all = [customers, unclassified, companies, assignments, openTickets, emergencies, contracts, visits]
  const failed = all.find(r => r.error)
  if (failed?.error) dbFail(failed.error)
  return {
    customers: customers.count ?? 0,
    unclassified: unclassified.count ?? 0,
    managementCompanies: companies.count ?? 0,
    activeAssignments: assignments.count ?? 0,
    openTickets: openTickets.count ?? 0,
    emergencyTickets: emergencies.count ?? 0,
    activeContracts: contracts.count ?? 0,
    upcomingVisits: visits.count ?? 0,
  }
})
