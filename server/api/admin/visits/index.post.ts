import { visitSchema } from '#shared/schemas/operations'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readValidatedBody(event, visitSchema.parse)
  const db = await userDb(event)
  const { data, error } = await db.from('technical_visits')
    .insert({ ...body, scheduled_for: new Date(body.scheduled_for).toISOString() }).select('id').single()
  if (error) dbFail(error)
  setResponseStatus(event, 201)
  return data
})
