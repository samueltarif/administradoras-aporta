import { messageSchema } from '#shared/schemas/operations'
import { uuidParam } from '#shared/schemas/registry'

export default defineEventHandler(async (event) => {
  const access = await requireAccess(event)
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const { body } = await readValidatedBody(event, messageSchema.parse)
  const db = await userDb(event)
  const { data, error } = await db.from('ticket_messages')
    .insert({ ticket_id: id, author_id: access.userId, body }).select('id').single()
  if (error) dbFail(error)
  setResponseStatus(event, 201)
  return data
})
