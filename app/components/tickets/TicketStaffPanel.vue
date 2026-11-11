<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { TicketDetail } from './types'
import { PRIORITY_LABEL, STATUS_LABEL, TICKET_PRIORITIES, TRANSITIONS } from '#shared/domain/labels'

const props = defineProps<{ ticket: TicketDetail['ticket'] }>()
const emit = defineEmits<{ changed: [] }>()
const { data: lookups } = useFetch<{ staff: { id: string, name: string }[] }>('/api/admin/lookups', { default: () => ({ staff: [] }) })
const form = reactive({ status: props.ticket.status, priority: props.ticket.priority, assigned_to: props.ticket.assigned_to ?? '' })
watch(() => props.ticket, (t) => { Object.assign(form, { status: t.status, priority: t.priority, assigned_to: t.assigned_to ?? '' }) })
const nextStatuses = computed(() => [props.ticket.status, ...TRANSITIONS[props.ticket.status]])
const dirty = computed(() => form.status !== props.ticket.status || form.priority !== props.ticket.priority
  || (form.assigned_to || null) !== props.ticket.assigned_to)
const saving = ref(false)

async function save() {
  saving.value = true
  try {
    await api(`/api/tickets/${props.ticket.id}`, { method: 'PATCH', body: { ...form, assigned_to: form.assigned_to || null } })
    toast.success('Chamado atualizado.')
    emit('changed')
  }
  catch (e) { toast.error(apiErrorMessage(e)) }
  finally { saving.value = false }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <AppField id="st-status" label="Situação">
      <NativeSelect id="st-status" v-model="form.status" :disabled="!TRANSITIONS[ticket.status].length">
        <option v-for="s in nextStatuses" :key="s" :value="s">{{ STATUS_LABEL[s] }}</option>
      </NativeSelect>
    </AppField>
    <AppField id="st-priority" label="Prioridade">
      <NativeSelect id="st-priority" v-model="form.priority">
        <option v-for="p in TICKET_PRIORITIES" :key="p" :value="p">{{ PRIORITY_LABEL[p] }}</option>
      </NativeSelect>
    </AppField>
    <AppField id="st-assigned" label="Responsável técnico">
      <NativeSelect id="st-assigned" v-model="form.assigned_to">
        <option value="">Sem responsável</option>
        <option v-for="s in lookups.staff" :key="s.id" :value="s.id">{{ s.name }}</option>
      </NativeSelect>
    </AppField>
    <Button type="submit" class="w-full" :disabled="!dirty || saving">{{ saving ? 'Salvando…' : 'Salvar alterações' }}</Button>
  </form>
</template>
