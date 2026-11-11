import { managementCompanySchema } from '#shared/schemas/registry'

export default defineEventHandler(async (event) => {
  await requireStaff(event, ['owner'])
  const body = await readValidatedBody(event, managementCompanySchema.parse)
  const db = await userDb(event)
  const { data, error } = await db.from('management_companies').insert(body).select('id').single()
  if (error) dbFail(error)
  setResponseStatus(event, 201)
  return data
})
