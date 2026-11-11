import { visitUpdateSchema } from '#shared/schemas/operations'
import { uuidParam } from '#shared/schemas/registry'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const body = await readValidatedBody(event, visitUpdateSchema.parse)
  const db = await userDb(event)
  const completed_at = body.status === 'completed' ? new Date().toISOString() : null
  const { data, error } = await db.from('technical_visits').update({ ...body, completed_at }).eq('id', id).select('id').single()
  if (error) dbFail(error)
  return data
})
