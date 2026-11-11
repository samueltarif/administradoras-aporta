import { uuidParam } from '#shared/schemas/registry'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const db = await userDb(event)
  const [company, linked] = await Promise.all([
    db.from('management_companies').select('*').eq('id', id).single(),
    db.from('management_assignments')
      .select('id, recorded_at, effective_from, source_system, customers(id, trade_name, customer_kind, active)', { count: 'exact' })
      .eq('management_company_id', id).is('ended_at', null)
      .order('recorded_at', { ascending: false }).limit(100),
  ])
  if (company.error) dbFail(company.error)
  if (linked.error) dbFail(linked.error)
  return { company: company.data, customers: linked.data ?? [], customersTotal: linked.count ?? 0 }
})
