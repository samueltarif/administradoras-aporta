import { ticketCreateSchema } from '#shared/schemas/operations'

export default defineEventHandler(async (event) => {
  const access = await requireAccess(event)
  const body = await readValidatedBody(event, ticketCreateSchema.parse)
  const db = await userDb(event)
  // created_by vem da sessão; a policy confere que o usuário tem acesso ao cliente.
  const { data, error } = await db.from('tickets')
    .insert({ ...body, created_by: access.userId }).select('id, number').single()
  if (error) dbFail(error)
  setResponseStatus(event, 201)
  return data
})
