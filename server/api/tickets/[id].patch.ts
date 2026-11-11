import { ticketStaffUpdateSchema } from '#shared/schemas/operations'
import { uuidParam } from '#shared/schemas/registry'

// Equipe altera status, prioridade e responsável. Transições são validadas pelo banco.
export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const body = await readValidatedBody(event, ticketStaffUpdateSchema.parse)
  const db = await userDb(event)
  const patch: { status?: typeof body.status, priority?: typeof body.priority, assigned_to?: string | null } = {}
  if (body.status) patch.status = body.status
  if (body.priority) patch.priority = body.priority
  if (body.assigned_to !== undefined) patch.assigned_to = body.assigned_to
  if (!Object.keys(patch).length) throw createError({ statusCode: 400, statusMessage: 'Nada a alterar' })
  const { data, error } = await db.from('tickets').update(patch).eq('id', id).select('id, status').single()
  if (error) dbFail(error)
  return data
})
