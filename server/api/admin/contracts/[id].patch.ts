import { contractSchema } from '#shared/schemas/operations'
import { uuidParam } from '#shared/schemas/registry'

export default defineEventHandler(async (event) => {
  await requireStaff(event, ['owner'])
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const body = await readValidatedBody(event, contractSchema.parse)
  return saveContract(event, body, id)
})
