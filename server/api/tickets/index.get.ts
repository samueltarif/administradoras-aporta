import { OPEN_STATUSES } from '#shared/domain/labels'
import { ticketListQuerySchema } from '#shared/schemas/operations'

// Lista única para painel e portal: a RLS decide o que cada perfil enxerga.
export default defineEventHandler(async (event) => {
  await requireAccess(event)
  const query = await getValidatedQuery(event, ticketListQuerySchema.parse)
  const db = await userDb(event)
  let req = db.from('tickets')
    .select('id, number, title, status, priority, category, created_at, updated_at, customer_id, customers(id, trade_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
  if (query.status === 'active') req = req.in('status', OPEN_STATUSES)
  else if (query.status !== 'all') req = req.eq('status', query.status)
  if (query.priority !== 'all') req = req.eq('priority', query.priority)
  if (query.customer) req = req.eq('customer_id', query.customer)
  const term = searchTerm(query.q)
  if (term) req = /^\d+$/.test(term) ? req.eq('number', Number(term)) : req.ilike('title', `%${term}%`)
  const { data, count, error } = await req.range(...pageRange(query.page, query.pageSize))
  if (error) dbFail(error)
  return { items: data ?? [], total: count ?? 0, page: query.page, pageSize: query.pageSize }
})
