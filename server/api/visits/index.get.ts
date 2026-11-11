import { z } from 'zod'
import { VISIT_STATUSES } from '#shared/domain/labels'

const query = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  status: z.enum([...VISIT_STATUSES, 'all']).default('all'),
  customer: z.union([z.uuid(), z.literal('')]).optional().default(''),
})

// Agenda: visitas visíveis (RLS: equipe, administradora vinculada, síndico/responsável).
export default defineEventHandler(async (event) => {
  await requireAccess(event)
  const q = await getValidatedQuery(event, query.parse)
  const db = await userDb(event)
  let req = db.from('technical_visits')
    .select('id, title, scheduled_for, completed_at, status, result_summary, assigned_to, customers(id, trade_name), tickets(id, number, title), service_contracts(id, title)')
    .order('scheduled_for', { ascending: true }).limit(200)
  if (q.from) req = req.gte('scheduled_for', `${q.from}T00:00:00`)
  if (q.to) req = req.lte('scheduled_for', `${q.to}T23:59:59`)
  if (q.status !== 'all') req = req.eq('status', q.status)
  if (q.customer) req = req.eq('customer_id', q.customer)
  const { data, error } = await req
  if (error) dbFail(error)
  return data ?? []
})
