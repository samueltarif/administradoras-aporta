import { homePathFor } from '#shared/types/access'

// Navegação do painel interno. A permissão efetiva é verificada pela RLS e pelo servidor.
export default defineNuxtRouteMiddleware(async () => {
  const { ensure } = useAccess()
  const access = await ensure()
  if (!access) return navigateTo('/login')
  if (!access.staffRole) return navigateTo(homePathFor(access))
})
