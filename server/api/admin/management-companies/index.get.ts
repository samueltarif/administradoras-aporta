import { listQuerySchema } from '#shared/schemas/registry'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const query = await getValidatedQuery(event, listQuerySchema.parse)
  const db = await userDb(event)
  let req = db.from('management_companies')
    .select('id, trade_name, legal_name, cnpj, legacy_code, active, updated_at', { count: 'exact' })
    .order('trade_name')
  const term = searchTerm(query.q)
  if (term) req = req.or(orIlike(term, ['trade_name', 'legal_name'], ['legacy_code', 'cnpj']))
  if (query.active !== 'all') req = req.eq('active', query.active === 'true')
  const { data, count, error } = await req.range(...pageRange(query.page, query.pageSize))
  if (error) dbFail(error)
  return { items: data ?? [], total: count ?? 0, page: query.page, pageSize: query.pageSize }
})
