import { uuidParam } from '#shared/schemas/registry'

// Cliente + histórico completo de vínculos com administradoras (ativos e encerrados).
export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const db = await userDb(event)
  const head = { count: 'exact' as const, head: true }
  const [customer, history, tickets, contracts] = await Promise.all([
    db.from('customers').select('*').eq('id', id).single(),
    db.from('management_assignments')
      .select('id, recorded_at, effective_from, ended_at, source_system, management_companies(id, trade_name)')
      .eq('customer_id', id).order('recorded_at', { ascending: false }),
    db.from('tickets').select('id', head).eq('customer_id', id),
    db.from('service_contracts').select('id', head).eq('customer_id', id),
  ])
  if (customer.error) dbFail(customer.error)
  if (history.error) dbFail(history.error)
  return {
    customer: customer.data,
    assignments: history.data ?? [],
    ticketsTotal: tickets.count ?? 0,
    contractsTotal: contracts.count ?? 0,
  }
})
