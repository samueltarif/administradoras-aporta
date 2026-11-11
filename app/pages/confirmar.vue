<script setup lang="ts">
import type { EmailOtpType } from '@supabase/supabase-js'
import { homePathFor } from '#shared/types/access'

// Retorno de links de e-mail (convite e recuperação). Aceita token_hash, código PKCE ou tokens no fragmento.
definePageMeta({ layout: 'auth' })
useHead({ title: 'Validando acesso · Portal A Porta Móvel' })

const supabase = useSupabaseClient()
const { refresh } = useAccess()
const failed = ref(false)
const OTP_TYPES: EmailOtpType[] = ['invite', 'recovery', 'magiclink', 'signup', 'email_change', 'email']

async function establishSession(url: URL, hash: URLSearchParams) {
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) throw error
    return type
  }
  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    if (error) throw error
    return hash.get('type')
  }
  const code = url.searchParams.get('code')
  const { data } = await supabase.auth.getSession()
  if (!data.session && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
  }
  return null
}

onMounted(async () => {
  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.slice(1))
  if (url.searchParams.get('error_description') || hash.get('error_description')) {
    failed.value = true
    return
  }
  try {
    const kind = await establishSession(url, hash)
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw new Error('sem sessão')
    window.history.replaceState(null, '', '/confirmar') // remove tokens da barra de endereço
    const needsPassword = kind === 'invite' || kind === 'recovery'
      || url.searchParams.get('next') === '/redefinir-senha'
    if (needsPassword) {
      await navigateTo({ path: '/redefinir-senha', query: { origem: kind === 'invite' ? 'convite' : 'recuperacao' } }, { replace: true })
      return
    }
    await navigateTo(homePathFor(await refresh()), { replace: true })
  }
  catch {
    failed.value = true
  }
})
</script>

<template>
  <Card>
    <CardContent class="space-y-4 py-2">
      <template v-if="failed">
        <AppFormAlert>O link é inválido ou expirou. Solicite um novo link.</AppFormAlert>
        <div class="flex gap-3">
          <Button as-child variant="outline">
            <NuxtLink to="/login">Ir para o login</NuxtLink>
          </Button>
          <Button as-child>
            <NuxtLink to="/recuperar-senha">Novo link</NuxtLink>
          </Button>
        </div>
      </template>
      <div v-else class="flex items-center gap-3 text-muted-foreground" aria-live="polite">
        <Icon name="lucide:loader-circle" class="size-5 animate-spin" />
        Validando seu acesso…
      </div>
    </CardContent>
  </Card>
</template>
