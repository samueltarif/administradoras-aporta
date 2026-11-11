import { homePathFor } from '#shared/types/access'

// Telas de criação: só o proprietário grava (a RLS e o servidor também exigem).
export default defineNuxtRouteMiddleware(async (to) => {
  const access = await useAccess().ensure()
  if (!access) return navigateTo('/login')
  if (access.staffRole !== 'owner') return navigateTo(access.staffRole ? to.path.replace(/\/(nova|novo)$/, '') : homePathFor(access))
})
