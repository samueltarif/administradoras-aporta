// Portal do cliente: exige ao menos um vínculo ativo (ou ser da equipe).
export default defineNuxtRouteMiddleware(async () => {
  const { ensure } = useAccess()
  const access = await ensure()
  if (!access) return navigateTo('/login')
  const allowed = access.active && (access.staffRole || access.managements.length || access.customers.length)
  if (!allowed) return navigateTo('/sem-acesso')
})
