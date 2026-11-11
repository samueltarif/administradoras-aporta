<script setup lang="ts">
import { fieldErrors, recoverySchema } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Recuperar senha · Portal A Porta Móvel' })

const supabase = useSupabaseClient()
const email = ref('')
const error = ref('')
const sent = ref(false)
const loading = ref(false)

async function submit() {
  const parsed = recoverySchema.safeParse({ email: email.value })
  if (!parsed.success) {
    error.value = fieldErrors(parsed.error).email ?? 'E-mail inválido'
    return
  }
  error.value = ''
  loading.value = true
  const redirectTo = `${window.location.origin}/confirmar?next=/redefinir-senha`
  const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo })
  loading.value = false
  // Mesma resposta exista ou não a conta (evita enumeração de e-mails).
  if (err && err.status === 429) {
    error.value = 'Muitas solicitações. Aguarde alguns minutos.'
    return
  }
  sent.value = true
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl text-brand-blue">
        Recuperar senha
      </CardTitle>
      <CardDescription>Enviaremos um link para criar uma nova senha.</CardDescription>
    </CardHeader>
    <CardContent>
      <AppFormAlert v-if="sent" tone="success">
        Se o e-mail estiver cadastrado, você receberá o link em instantes. Verifique também a caixa de spam.
      </AppFormAlert>
      <form v-else class="space-y-5" novalidate @submit.prevent="submit">
        <div class="space-y-2">
          <Label for="email">E-mail</Label>
          <Input id="email" v-model="email" type="email" autocomplete="email" :aria-invalid="!!error || undefined" required />
          <p v-if="error" class="text-sm text-destructive">
            {{ error }}
          </p>
        </div>
        <Button type="submit" class="w-full" size="lg" :disabled="loading">
          {{ loading ? 'Enviando…' : 'Enviar link' }}
        </Button>
      </form>
    </CardContent>
    <CardFooter>
      <NuxtLink to="/login" class="text-sm font-medium text-brand-blue hover:underline">
        ← Voltar para o login
      </NuxtLink>
    </CardFooter>
  </Card>
</template>
