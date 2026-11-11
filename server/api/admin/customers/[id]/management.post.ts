import { z } from 'zod'
import { uuidParam } from '#shared/schemas/registry'

const body = z.object({
  management_id: z.union([z.uuid(), z.null()]),
  effective_from: z.union([z.iso.date(), z.literal(''), z.null()]).optional().transform(v => v || undefined),
})

// Troca/encerra o vínculo com administradora de forma atômica (RPC; somente proprietário).
export default defineEventHandler(async (event) => {
  await requireStaff(event, ['owner'])
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const input = await readValidatedBody(event, body.parse)
  const db = await userDb(event)
  const { data, error } = await db.rpc('admin_set_customer_management', {
    p_customer: id, p_management: input.management_id, p_effective_from: input.effective_from,
  })
  if (error) dbFail(error)
  return { assignmentId: data }
})
