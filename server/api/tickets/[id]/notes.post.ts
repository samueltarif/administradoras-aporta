import { messageSchema } from '#shared/schemas/operations'
import { uuidParam } from '#shared/schemas/registry'

// Nota interna: só a equipe grava e lê (RLS); nunca aparece no portal.
export default defineEventHandler(async (event) => {
  const access = await requireStaff(event)
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const { body } = await readValidatedBody(event, messageSchema.parse)
  const db = await userDb(event)
  const { data, error } = await db.from('ticket_internal_notes')
    .insert({ ticket_id: id, author_id: access.userId, body }).select('id').single()
  if (error) dbFail(error)
  setResponseStatus(event, 201)
  return data
})
