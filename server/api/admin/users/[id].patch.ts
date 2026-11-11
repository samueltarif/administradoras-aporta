import { profileStatusSchema } from '#shared/schemas/users'
import { uuidParam } from '#shared/schemas/registry'

// Ativa/desativa o usuário no portal (todas as policies exigem perfil ativo).
export default defineEventHandler(async (event) => {
  const access = await requireStaff(event, ['owner'])
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const { active } = await readValidatedBody(event, profileStatusSchema.parse)
  if (id === access.userId && !active) throw createError({ statusCode: 422, statusMessage: 'Você não pode desativar a si mesmo' })
  const db = await userDb(event)
  const { data, error } = await db.from('user_profiles').update({ active }).eq('user_id', id).select('user_id').single()
  if (error) dbFail(error)
  return data
})
