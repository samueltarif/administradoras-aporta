<script setup lang="ts">
import { toast } from 'vue-sonner'
import { fieldErrors } from '#shared/schemas/auth'
import { inviteSchema } from '#shared/schemas/users'
import { ROLE_LABEL } from '#shared/domain/labels'

const emit = defineEmits<{ invited: [] }>()
const { data: lookups } = useFetch<{ companies: { id: string, trade_name: string }[] }>('/api/admin/lookups', { default: () => ({ companies: [] }) })
const { data: customers } = useFetch<{ id: string, trade_name: string }[]>('/api/lookups/customers', { default: () => [] })
const form = reactive({ email: '', full_name: '', scope: 'customer', role: 'syndic', target_id: '' })
const roles = computed(() => (form.scope === 'staff' ? ['operations', 'owner'] : form.scope === 'management' ? ['manager', 'attendant'] : ['syndic', 'representative', 'porter']) as (keyof typeof ROLE_LABEL)[])
watch(() => form.scope, () => { form.role = roles.value[0]!; form.target_id = '' })
const errors = ref<Record<string, string>>({})
const saving = ref(false)

async function invite() {
  const body = { email: form.email, full_name: form.full_name, membership: { scope: form.scope, role: form.role, ...(form.scope === 'staff' ? {} : { target_id: form.target_id }) } }
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) { errors.value = fieldErrors(parsed.error); if (!form.target_id && form.scope !== 'staff') errors.value.target_id = 'Selecione'; return }
  if (form.role === 'owner' && !confirm('Conceder acesso de PROPRIETÁRIO (controle total)?')) return
  errors.value = {}
  saving.value = true
  try {
    const res = await api<{ emailSent: boolean }>('/api/admin/users/invite', { method: 'POST', body: parsed.data })
    toast.success(res.emailSent ? 'Convite enviado por e-mail.' : 'Usuário já existia: acesso concedido.')
    Object.assign(form, { email: '', full_name: '', target_id: '' })
    emit('invited')
  }
  catch (e) { toast.error(apiErrorMessage(e)) }
  finally { saving.value = false }
}
</script>

<template>
  <form novalidate class="grid gap-4 md:grid-cols-2" @submit.prevent="invite">
    <AppField id="i-name" label="Nome" :error="errors.full_name" required><Input id="i-name" v-model="form.full_name" maxlength="120" /></AppField>
    <AppField id="i-email" label="E-mail" :error="errors.email" required><Input id="i-email" v-model="form.email" type="email" maxlength="254" /></AppField>
    <AppField id="i-scope" label="Tipo de acesso">
      <NativeSelect id="i-scope" v-model="form.scope">
        <option value="customer">Condomínio / cliente</option><option value="management">Administradora</option><option value="staff">Equipe A Porta Móvel</option>
      </NativeSelect>
    </AppField>
    <AppField id="i-role" label="Papel">
      <NativeSelect id="i-role" v-model="form.role"><option v-for="r in roles" :key="r" :value="r">{{ ROLE_LABEL[r] }}</option></NativeSelect>
    </AppField>
    <AppField v-if="form.scope !== 'staff'" id="i-target" :label="form.scope === 'management' ? 'Administradora' : 'Cliente'" :error="errors.target_id" required class="md:col-span-2">
      <NativeSelect id="i-target" v-model="form.target_id"><option value="" disabled>Selecione…</option>
        <option v-for="o in (form.scope === 'management' ? lookups.companies : customers)" :key="o.id" :value="o.id">{{ o.trade_name }}</option></NativeSelect>
    </AppField>
    <p class="text-xs text-muted-foreground md:col-span-2">O acesso só é criado por convite. E-mails de contato importados do sistema antigo nunca viram login automaticamente.</p>
    <div class="flex justify-end md:col-span-2"><Button type="submit" :disabled="saving"><Icon name="lucide:send" /> {{ saving ? 'Enviando…' : 'Enviar convite' }}</Button></div>
  </form>
</template>
