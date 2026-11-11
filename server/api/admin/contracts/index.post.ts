import { contractSchema } from '#shared/schemas/operations'

export default defineEventHandler(async (event) => {
  await requireStaff(event, ['owner'])
  const body = await readValidatedBody(event, contractSchema.parse)
  setResponseStatus(event, 201)
  return saveContract(event, body)
})
