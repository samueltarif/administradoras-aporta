<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{ customerId: string, currentId: string | null }>()
const emit = defineEmits<{ changed: [] }>()
const { data: lookups } = useFetch<{ companies: { id: string, trade_name: string }[] }>('/api/admin/lookups', { default: () => ({ companies: [] }) })
const target = ref(props.currentId ?? '')
const effectiveFrom = ref('')
const saving = ref(false)

async function apply() {
  const label = target.value ? 'Trocar a administradora? O vínculo atual será encerrado e mantido no histórico.' : 'Encerrar o vínculo atual? O cliente ficará sem administradora.'
  if (!confirm(label)) return
  saving.value = true
  try {
    await api(`/api/admin/customers/${props.customerId}/management`, { method: 'POST', body: { management_id: target.value || null, effective_from: effectiveFrom.value || null } })
    toast.success('Vínculo atualizado.')
    emit('changed')
  }
  catch (e) { toast.error(apiErrorMessage(e)) }
  finally { saving.value = false }
}
</script>

<template>
  <form class="space-y-3 border-t pt-4" @submit.prevent="apply">
    <AppField id="as-target" label="Administradora">
      <NativeSelect id="as-target" v-model="target"><option value="">Sem administradora (independente)</option>
        <option v-for="c in lookups.companies" :key="c.id" :value="c.id">{{ c.trade_name }}</option></NativeSelect>
    </AppField>
    <AppField id="as-from" label="Início do vínculo" hint="Deixe vazio se a data for desconhecida."><Input id="as-from" v-model="effectiveFrom" type="date" /></AppField>
    <Button type="submit" size="sm" :disabled="saving || target === (currentId ?? '')">Aplicar</Button>
  </form>
</template>
