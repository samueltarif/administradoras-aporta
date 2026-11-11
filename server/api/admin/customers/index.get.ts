import { customerListQuerySchema } from '#shared/schemas/registry'

// Lista de clientes com a administradora ATIVA (vínculo sem ended_at).
export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const query = await getValidatedQuery(event, customerListQuerySchema.parse)
  const db = await userDb(event)
  const embed = query.management && query.management !== 'none'
    ? 'management_assignments!inner(id, management_companies(id, trade_name))'
    : 'management_assignments(id, management_companies(id, trade_name))'
  let req = db.from('customers')
    .select(`id, trade_name, legal_name, cnpj, address_text, customer_kind, legacy_code, active, ${embed}`, { count: 'exact' })
    .is('management_assignments.ended_at', null)
    .order('trade_name')
  if (query.management === 'none') req = req.is('management_assignments', null)
  else if (query.management) req = req.eq('management_assignments.management_company_id', query.management)
  const term = searchTerm(query.q)
  if (term) req = req.or(orIlike(term, ['trade_name', 'legal_name'], ['legacy_code', 'cnpj']))
  if (query.kind !== 'all') req = req.eq('customer_kind', query.kind)
  if (query.active !== 'all') req = req.eq('active', query.active === 'true')
  const { data, count, error } = await req.range(...pageRange(query.page, query.pageSize))
  if (error) dbFail(error)
  const summaries = query.include === 'summary' ? await summarizeCustomers(event, (data ?? []).map(c => c.id)) : null
  const items = (data ?? []).map(({ management_assignments: links, ...c }) => ({
    ...c,
    management: links?.[0]?.management_companies ?? null,
    summary: summaries?.[c.id] ?? null,
  }))
  return { items, total: count ?? 0, page: query.page, pageSize: query.pageSize }
})
