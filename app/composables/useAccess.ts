import type { AccessContext } from '#shared/types/access'
import { homePathFor } from '#shared/types/access'

/** Contexto de acesso do usuário. Serve à navegação; quem autoriza é o banco/servidor. */
export function useAccess() {
  const access = useState<AccessContext | null>('pm-access', () => null)
  const session = useSupabaseSession()

  async function refresh(): Promise<AccessContext | null> {
    if (!session.value) {
      access.value = null
      return null
    }
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    access.value = await api<AccessContext>('/api/me', { headers }).catch(() => null)
    return access.value
  }

  async function ensure(): Promise<AccessContext | null> {
    if (access.value && access.value.userId) return access.value
    return refresh()
  }

  function clear() {
    access.value = null
  }

  const homePath = computed(() => homePathFor(access.value))
  return { access, refresh, ensure, clear, homePath }
}
