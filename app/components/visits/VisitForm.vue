<script setup lang="ts">
import { toast } from 'vue-sonner'
import { fieldErrors } from '#shared/schemas/auth'
import { visitSchema } from '#shared/schemas/operations'

const emit = defineEmits<{ saved: [] }>()
const { data: customers } = useFetch<{ id: string, trade_name: string }[]>('/api/lookups/customers', { default: () => [] })
const { data: lookups } = useFetch<{ staff: { id: string, name: string }[] }>('/api/admin/lookups', { default: () => ({ staff: [] }) })
const form = reactive({ customer_id: '', title: '', scheduled_for: '', assigned_to: '' })
const errors = ref<Record<string, string>>({})
const saving = ref(false)

async function save() {
  const payload = { ...form, scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : '' }
  const parsed = visitSchema.safeParse(payload)
  if (!parsed.success) { errors.value = fieldErrors(parsed.error); return }
  errors.value = {}
  saving.value = true
  try {
    await api('/api/admin/visits', { method: 'POST', body: parsed.data })
    toast.success('Visita agendada.')
    Object.assign(form, { title: '', scheduled_for: '' })
    emit('saved')
  }
  catch (e) { toast.error(apiErrorMessage(e)) }
  finally { saving.value = false }
}
</script>

<template>
  <form novalidate class="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_12rem_minmax(0,1fr)_auto] md:items-end" @submit.prevent="save">
    <AppField id="v-customer" label="Cliente" :error="errors.customer_id">
      <NativeSelect id="v-customer" v-model="form.customer_id"><option value="" disabled>Selecione…</option>
        <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.trade_name }}</option></NativeSelect>
    </AppField>
    <AppField id="v-title" label="Objetivo" :error="errors.title"><Input id="v-title" v-model="form.title" maxlength="160" placeholder="Ex.: Preventiva mensal" /></AppField>
    <AppField id="v-when" label="Data e hora" :error="errors.scheduled_for"><Input id="v-when" v-model="form.scheduled_for" type="datetime-local" /></AppField>
    <AppField id="v-tech" label="Técnico">
      <NativeSelect id="v-tech" v-model="form.assigned_to"><option value="">A definir</option>
        <option v-for="s in lookups.staff" :key="s.id" :value="s.id">{{ s.name }}</option></NativeSelect>
    </AppField>
    <Button type="submit" :disabled="saving"><Icon name="lucide:calendar-plus" /> Agendar</Button>
  </form>
</template>
