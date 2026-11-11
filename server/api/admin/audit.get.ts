import { z } from 'zod'

const query = z.object({ page: z.coerce.number().int().min(1).default(1), entity: z.string().regex(/^[a-z_]*$/).max(40).optional().default('') })

// Trilha de auditoria (somente proprietário pela RLS). Detalhes já minimizados no banco.
export default defineEventHandler(async (event) => {
  await requireStaff(event, ['owner'])
  const q = await getValidatedQuery(event, query.parse)
  const db = await userDb(event)
  let req = db.from('audit_events').select('id, action, entity_name, entity_id, details, created_at, actor_id, user_profiles(display_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
  if (q.entity) req = req.eq('entity_name', q.entity)
  const { data, count, error } = await req.range(...pageRange(q.page, 50))
  if (error) dbFail(error)
  return { items: data ?? [], total: count ?? 0, page: q.page, pageSize: 50 }
})
