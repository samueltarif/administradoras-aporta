import { z } from 'zod'
import { CONTRACT_STATUSES } from '#shared/domain/labels'

const query = z.object({
  status: z.enum([...CONTRACT_STATUSES, 'all']).default('all'),
  customer: z.union([z.uuid(), z.literal('')]).optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
})

// Contratos visíveis ao usuário (RLS). Valores só retornam ao proprietário (RLS de contract_financials).
export default defineEventHandler(async (event) => {
  await requireAccess(event)
  const q = await getValidatedQuery(event, query.parse)
  const db = await userDb(event)
  let req = db.from('service_contracts')
    .select('id, contract_number, title, status, maintenance_frequency, starts_on, ends_on, contractor_type, customers(id, trade_name), management_companies(id, trade_name), contract_financials(monthly_value)', { count: 'exact' })
    .order('created_at', { ascending: false })
  if (q.status !== 'all') req = req.eq('status', q.status)
  if (q.customer) req = req.eq('customer_id', q.customer)
  const { data, count, error } = await req.range(...pageRange(q.page, q.pageSize))
  if (error) dbFail(error)
  return { items: data ?? [], total: count ?? 0, page: q.page, pageSize: q.pageSize }
})
