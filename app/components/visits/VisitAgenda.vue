<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { VisitStatus } from '~/types/database.types'
import { VISIT_STATUS_LABEL, VISIT_STATUSES } from '#shared/domain/labels'

interface Visit {
  id: string, title: string, scheduled_for: string | null, status: VisitStatus, result_summary: string | null
  customers: { trade_name: string } | null, tickets: { id: string, number: number } | null
}
const props = defineProps<{ staff?: boolean, ticketBase: string }>()
const from = ref(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
const to = ref(new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10))
const { data, status, refresh } = useFetch<Visit[]>('/api/visits', { query: { from, to }, default: () => [] })
defineExpose({ refresh })
const groups = computed(() => {
  const map = new Map<string, Visit[]>()
  for (const v of data.value) {
    const key = v.scheduled_for ? new Date(v.scheduled_for).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : 'Sem data'
    map.set(key, [...(map.get(key) ?? []), v])
  }
  return [...map.entries()]
})
const time = (d: string | null) => (d ? new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '')
const tone = (s: VisitStatus) => (s === 'completed' ? 'success' : s === 'cancelled' ? 'muted' : s === 'in_progress' ? 'warning' : 'info')

async function setStatus(v: Visit, s: VisitStatus) {
  const result = s === 'completed' ? prompt('Resumo do serviço realizado (opcional):') ?? '' : v.result_summary ?? ''
  try {
    await api(`/api/admin/visits/${v.id}`, { method: 'PATCH', body: { status: s, result_summary: result } })
    toast.success('Visita atualizada.')
    await refresh()
  }
  catch (e) { toast.error(apiErrorMessage(e)) }
}
</script>

<template>
  <Card class="gap-0 py-0">
    <div class="flex flex-wrap items-end gap-3 border-b p-3">
      <AppField id="from" label="De"><Input id="from" v-model="from" type="date" /></AppField>
      <AppField id="to" label="Até"><Input id="to" v-model="to" type="date" /></AppField>
    </div>
    <div v-if="status === 'pending'" class="space-y-2 p-3"><Skeleton v-for="i in 4" :key="i" class="h-12" /></div>
    <AppEmptyState v-else-if="!data.length" title="Nenhuma visita no período" icon="lucide:calendar-days" />
    <div v-else class="divide-y">
      <section v-for="[day, visits] in groups" :key="day" class="px-4 py-3">
        <h3 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{{ day }}</h3>
        <ul class="space-y-2">
          <li v-for="v in visits" :key="v.id" class="flex flex-wrap items-center gap-3 rounded-lg border bg-white px-3 py-2">
            <span class="w-12 text-sm font-semibold tabular-nums">{{ time(v.scheduled_for) }}</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">{{ v.title }}</p>
              <p class="text-xs text-muted-foreground">{{ v.customers?.trade_name }}
                <NuxtLink v-if="v.tickets" :to="`${ticketBase}/${v.tickets.id}`" class="text-brand-blue hover:underline">· chamado #{{ v.tickets.number }}</NuxtLink></p>
              <p v-if="v.result_summary" class="text-xs">{{ v.result_summary }}</p>
            </div>
            <NativeSelect v-if="props.staff" :model-value="v.status" class="w-40" aria-label="Situação da visita" @update:model-value="s => setStatus(v, s as VisitStatus)">
              <option v-for="s in VISIT_STATUSES" :key="s" :value="s">{{ VISIT_STATUS_LABEL[s] }}</option>
            </NativeSelect>
            <Badge v-else :variant="tone(v.status)">{{ VISIT_STATUS_LABEL[v.status] }}</Badge>
          </li>
        </ul>
      </section>
    </div>
  </Card>
</template>
