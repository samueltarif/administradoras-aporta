import { customerActionSchema } from '#shared/schemas/operations'
import { uuidParam } from '#shared/schemas/registry'

// Ações do cliente (cancelar, confirmar resolução, reabrir) via RPC com validação no banco.
export default defineEventHandler(async (event) => {
  await requireAccess(event)
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const { action, comment } = await readValidatedBody(event, customerActionSchema.parse)
  const db = await userDb(event)
  const { data, error } = await db.rpc('customer_ticket_action', { p_ticket: id, p_action: action, p_comment: comment })
  if (error) dbFail(error)
  return { status: data }
})
