export function useSignOut() {
  const supabase = useSupabaseClient()
  const { clear } = useAccess()
  return async () => {
    await supabase.auth.signOut()
    clear()
    await navigateTo('/login', { replace: true })
  }
}
