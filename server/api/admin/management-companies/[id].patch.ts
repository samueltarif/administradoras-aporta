import { managementCompanySchema, uuidParam } from '#shared/schemas/registry'

export default defineEventHandler(async (event) => {
  await requireStaff(event, ['owner'])
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  // Formulário envia o registro completo (evita defaults reativarem campos omitidos).
  const body = await readValidatedBody(event, managementCompanySchema.parse)
  const db = await userDb(event)
  const { data, error } = await db.from('management_companies').update(body).eq('id', id).select('id').single()
  if (error) dbFail(error)
  return data
})
