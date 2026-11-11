<script setup lang="ts">
import { fieldErrors, loginSchema } from '#shared/schemas/auth'
import { homePathFor } from '#shared/types/access'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Entrar · Portal A Porta Móvel' })

const supabase = useSupabaseClient()
const { refresh } = useAccess()
const redirectInfo = useSupabaseCookieRedirect()
const route = useRoute()

const form = reactive({ email: '', password: '' })
const errors = ref<Record<string, string>>({})
const formError = ref('')
const loading = ref(false)
const notice = computed(() => route.query.motivo === 'senha-alterada'
  ? 'Senha alterada. Entre com a nova senha.'
  : '')

async function submit() {
  formError.value = ''
  const parsed = loginSchema.safeParse(form)
  if (!parsed.success) {
    errors.value = fieldErrors(parsed.error)
    return
  }
  errors.value = {}
  loading.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword(parsed.data)
    if (error) {
      // Mensagem genérica: não revela se o e-mail existe.
      formError.value = error.status === 429
        ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
        : 'E-mail ou senha inválidos.'
      return
    }
    const access = await refresh()
    const saved = redirectInfo.pluck()
    const target = saved && saved.startsWith('/') && !saved.startsWith('//') ? saved : homePathFor(access)
    await navigateTo(target, { replace: true })
  }
  catch {
    formError.value = 'Não foi possível entrar agora. Verifique sua conexão.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl text-brand-blue">
        Entrar no portal
      </CardTitle>
      <CardDescription>Use o e-mail cadastrado pela A Porta Móvel.</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="space-y-5" novalidate @submit.prevent="submit">
        <AppFormAlert v-if="notice" tone="success">
          {{ notice }}
        </AppFormAlert>
        <AppFormAlert v-if="formError">
          {{ formError }}
        </AppFormAlert>
        <div class="space-y-2">
          <Label for="email">E-mail</Label>
          <Input
            id="email"
            v-model="form.email"
            type="email"
            inputmode="email"
            autocomplete="username"
            :aria-invalid="!!errors.email || undefined"
            required
          />
          <p v-if="errors.email" class="text-sm text-destructive">
            {{ errors.email }}
          </p>
        </div>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="password">Senha</Label>
            <NuxtLink to="/recuperar-senha" class="text-sm font-medium text-brand-blue hover:underline">
              Esqueci minha senha
            </NuxtLink>
          </div>
          <AppPasswordInput id="password" v-model="form.password" autocomplete="current-password" :invalid="!!errors.password" />
          <p v-if="errors.password" class="text-sm text-destructive">
            {{ errors.password }}
          </p>
        </div>
        <Button type="submit" class="w-full" size="lg" :disabled="loading">
          <Icon v-if="loading" name="lucide:loader-circle" class="animate-spin" />
          {{ loading ? 'Entrando…' : 'Entrar' }}
        </Button>
        <p class="text-center text-xs text-muted-foreground">
          O acesso é liberado por convite. Não há cadastro aberto.
        </p>
      </form>
    </CardContent>
  </Card>
</template>
