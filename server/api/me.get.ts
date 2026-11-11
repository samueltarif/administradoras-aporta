export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const access = await getAccess(event)
  if (!access) throw createError({ statusCode: 401, statusMessage: 'Sessão inválida ou expirada' })
  return access
})
