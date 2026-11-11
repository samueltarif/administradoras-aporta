<script setup lang="ts">
import { toast } from 'vue-sonner'
import { fieldErrors } from '#shared/schemas/auth'
import { contractSchema } from '#shared/schemas/operations'
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUSES, FREQUENCIES, FREQUENCY_LABEL } from '#shared/domain/labels'

type Initial = Partial<Record<'customer_id' | 'contractor_type' | 'contractor_management_id' | 'contract_number' | 'title' | 'description'
  | 'starts_on' | 'ends_on' | 'maintenance_frequency' | 'status', string | null>> & { monthly_value?: number | null }
const props = defineProps<{ id?: string, initial?: Initial }>()
const emit = defineEmits<{ saved: [id: string] }>()
const { data: customers } = useFetch<{ id: string, trade_name: string }[]>('/api/lookups/customers', { default: () => [] })
const { data: lookups } = useFetch<{ companies: { id: string, trade_name: string }[] }>('/api/admin/lookups', { default: () => ({ companies: [] }) })
const s = (v: string | null | undefined) => v ?? ''
const form = reactive({
  customer_id: s(props.initial?.customer_id), contractor_type: s(props.initial?.contractor_type) || 'customer',
  contractor_management_id: s(props.initial?.contractor_management_id), contract_number: s(props.initial?.contract_number),
  title: s(props.initial?.title), description: s(props.initial?.description), starts_on: s(props.initial?.starts_on),
  ends_on: s(props.initial?.ends_on), maintenance_frequency: s(props.initial?.maintenance_frequency) || 'monthly',
  status: s(props.initial?.status) || 'draft', monthly_value: props.initial?.monthly_value?.toString() ?? '',
})
const errors = ref<Record<string, string>>({})
const saving = ref(false)

async function save() {
  const parsed = contractSchema.safeParse(form)
  if (!parsed.success) { errors.value = fieldErrors(parsed.error); toast.error('Revise os campos destacados.'); return }
  errors.value = {}
  saving.value = true
  try {
    const res = await api<{ id: string }>(props.id ? `/api/admin/contracts/${props.id}` : '/api/admin/contracts', { method: props.id ? 'PATCH' : 'POST', body: parsed.data })
    toast.success('Contrato salvo.')
    emit('saved', res.id)
  }
  catch (e) { toast.error(apiErrorMessage(e)) }
  finally { saving.value = false }
}
</script>

<template>
  <form novalidate class="grid gap-5 sm:grid-cols-2" @submit.prevent="save">
    <AppField id="c-customer" label="Cliente atendido" :error="errors.customer_id" required class="sm:col-span-2">
      <NativeSelect id="c-customer" v-model="form.customer_id"><option value="" disabled>Selecione…</option>
        <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.trade_name }}</option></NativeSelect>
    </AppField>
    <AppField id="c-type" label="Contratante" required hint="Independe do vínculo de administração do prédio.">
      <NativeSelect id="c-type" v-model="form.contractor_type"><option value="customer">O próprio cliente</option><option value="management">Uma administradora</option></NativeSelect>
    </AppField>
    <AppField v-if="form.contractor_type === 'management'" id="c-mgmt" label="Administradora contratante" :error="errors.contractor_management_id" required>
      <NativeSelect id="c-mgmt" v-model="form.contractor_management_id"><option value="" disabled>Selecione…</option>
        <option v-for="m in lookups.companies" :key="m.id" :value="m.id">{{ m.trade_name }}</option></NativeSelect>
    </AppField>
    <AppField id="c-title" label="Objeto do contrato" :error="errors.title" required class="sm:col-span-2"><Input id="c-title" v-model="form.title" maxlength="160" /></AppField>
    <AppField id="c-number" label="Número"><Input id="c-number" v-model="form.contract_number" maxlength="40" /></AppField>
    <AppField id="c-status" label="Situação" required>
      <NativeSelect id="c-status" v-model="form.status"><option v-for="st in CONTRACT_STATUSES" :key="st" :value="st">{{ CONTRACT_STATUS_LABEL[st] }}</option></NativeSelect>
    </AppField>
    <AppField id="c-start" label="Início da vigência" :error="errors.starts_on"><Input id="c-start" v-model="form.starts_on" type="date" /></AppField>
    <AppField id="c-end" label="Fim da vigência" :error="errors.ends_on"><Input id="c-end" v-model="form.ends_on" type="date" /></AppField>
    <AppField id="c-freq" label="Periodicidade das preventivas">
      <NativeSelect id="c-freq" v-model="form.maintenance_frequency"><option value="">Sem preventivas</option>
        <option v-for="f in FREQUENCIES" :key="f" :value="f">{{ FREQUENCY_LABEL[f] }}</option></NativeSelect>
    </AppField>
    <AppField id="c-value" label="Valor mensal (R$)" :error="errors.monthly_value" hint="Visível somente ao proprietário.">
      <Input id="c-value" v-model="form.monthly_value" type="number" min="0" step="0.01" inputmode="decimal" />
    </AppField>
    <AppField id="c-desc" label="Descrição / escopo" class="sm:col-span-2"><Textarea id="c-desc" v-model="form.description" rows="4" maxlength="2000" /></AppField>
    <div class="flex justify-end sm:col-span-2"><Button type="submit" :disabled="saving">{{ saving ? 'Salvando…' : 'Salvar contrato' }}</Button></div>
  </form>
</template>
