<script setup lang="ts">
import { fieldErrors, newPasswordSchema } from '#shared/schemas/auth'
import { homePathFor } from '#shared/types/access'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Definir senha · Portal A Porta Móvel' })

const supabase = useSupabaseClient()
const { refresh } = useAccess()
const route = useRoute()
const isInvite = computed(() => route.query.origem === 'convite')

const ready = ref(false)
const hasSession = ref(false)
const form = reactive({ password: '', confirm: '' })
const errors = ref<Record<string, string>>({})
const formError = ref('')
const loading = ref(false)

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  hasSession.value = Boolean(data.session)
  ready.value = true
})

async function submit() {
  formError.value = ''
  const parsed = newPasswordSchema.safeParse(form)
  if (!parsed.success) {
    errors.value = fieldErrors(parsed.error)
    return
  }
  errors.value = {}
  loading.value = true
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  loading.value = false
  if (error) {
    formError.value = error.code === 'same_password'
      ? 'A nova senha deve ser diferente da anterior.'
      : error.code === 'weak_password'
        ? 'Senha considerada fraca ou vazada. Escolha outra.'
        : 'Não foi possível salvar a senha. Solicite um novo link.'
    return
  }
  await navigateTo(homePathFor(await refresh()), { replace: true })
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl text-brand-blue">
        {{ isInvite ? 'Crie sua senha' : 'Nova senha' }}
      </CardTitle>
      <CardDescription>Mínimo de 10 caracteres, com letras e números.</CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="!ready" class="h-40 animate-pulse rounded-md bg-muted" />
      <div v-else-if="!hasSession" class="space-y-4">
        <AppFormAlert>Link inválido ou expirado. Solicite um novo link de recuperação.</AppFormAlert>
        <Button as-child class="w-full">
          <NuxtLink to="/recuperar-senha">Solicitar novo link</NuxtLink>
        </Button>
      </div>
      <form v-else class="space-y-5" novalidate @submit.prevent="submit">
        <AppFormAlert v-if="formError">
          {{ formError }}
        </AppFormAlert>
        <div class="space-y-2">
          <Label for="password">Nova senha</Label>
          <AppPasswordInput id="password" v-model="form.password" autocomplete="new-password" :invalid="!!errors.password" />
          <p v-if="errors.password" class="text-sm text-destructive">
            {{ errors.password }}
          </p>
        </div>
        <div class="space-y-2">
          <Label for="confirm">Confirme a senha</Label>
          <AppPasswordInput id="confirm" v-model="form.confirm" autocomplete="new-password" :invalid="!!errors.confirm" />
          <p v-if="errors.confirm" class="text-sm text-destructive">
            {{ errors.confirm }}
          </p>
        </div>
        <Button type="submit" class="w-full" size="lg" :disabled="loading">
          {{ loading ? 'Salvando…' : 'Salvar senha' }}
        </Button>
      </form>
    </CardContent>
  </Card>
</template>
