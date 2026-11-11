<script setup lang="ts">
import type { TicketPriority, TicketStatus } from '~/types/database.types'
import TicketStatusBadge from '~/components/tickets/TicketStatusBadge.vue'

definePageMeta({ layout: 'portal', middleware: ['portal'] })
useHead({ title: 'Início · Portal A Porta Móvel' })
interface Summary {
  open: number, inProgress: number, resolved30d: number, activeContracts: number
  nextVisits: { id: string, title: string, scheduled_for: string, customers: { trade_name: string } | null }[]
  recent: { id: string, number: number, title: string, status: TicketStatus, priority: TicketPriority, updated_at: string, customers: { trade_name: string } | null }[]
}
const { access } = useAccess()
const { data, status } = useFetch<Summary>('/api/portal/summary')
const fmt = (d: string) => new Date(d).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const cards = computed(() => [
  { label: 'Aguardando atendimento', value: data.value?.open, icon: 'lucide:inbox' },
  { label: 'Em andamento', value: data.value?.inProgress, icon: 'lucide:wrench' },
  { label: 'Resolvidos (30 dias)', value: data.value?.resolved30d, icon: 'lucide:circle-check' },
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-brand-blue">Olá, {{ access?.displayName ?? 'bem-vindo(a)' }}</h1>
        <p class="text-sm text-muted-foreground">Acompanhe seus chamados, serviços e manutenções em um só lugar.</p>
      </div>
      <Button as-child size="lg"><NuxtLink to="/portal/chamados/novo"><Icon name="lucide:plus" /> Abrir chamado</NuxtLink></Button>
    </div>
    <div class="grid gap-4 sm:grid-cols-3">
      <Card v-for="c in cards" :key="c.label" class="gap-2 px-5 py-5">
        <div class="flex items-center justify-between text-sm text-muted-foreground">{{ c.label }}<Icon :name="c.icon" class="size-5 text-brand-blue" /></div>
        <Skeleton v-if="status === 'pending'" class="h-8 w-16" />
        <p v-else class="text-3xl font-semibold tabular-nums">{{ c.value ?? 0 }}</p>
      </Card>
    </div>
    <div class="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card class="gap-0 py-0">
        <CardHeader class="flex items-center justify-between border-b py-4">
          <CardTitle>Atualizações recentes</CardTitle>
          <NuxtLink to="/portal/chamados?status=all" class="text-sm font-medium text-brand-blue hover:underline">Ver todos</NuxtLink>
        </CardHeader>
        <AppEmptyState v-if="data && !data.recent.length" title="Nenhum chamado ainda" icon="lucide:wrench" />
        <ul v-else class="divide-y">
          <li v-for="t in data?.recent" :key="t.id">
            <NuxtLink :to="`/portal/chamados/${t.id}`" class="flex items-center gap-3 px-6 py-3 hover:bg-muted/50">
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">#{{ t.number }} · {{ t.title }}</p>
                <p class="text-xs text-muted-foreground">{{ t.customers?.trade_name }}</p>
              </div>
              <TicketStatusBadge :status="t.status" />
            </NuxtLink>
          </li>
        </ul>
      </Card>
      <Card class="gap-0 py-0">
        <CardHeader class="border-b py-4"><CardTitle>Próximas visitas</CardTitle></CardHeader>
        <AppEmptyState v-if="data && !data.nextVisits.length" title="Nenhuma visita agendada" icon="lucide:calendar" />
        <ul v-else class="divide-y">
          <li v-for="v in data?.nextVisits" :key="v.id" class="px-6 py-3">
            <p class="text-sm font-medium">{{ v.title }}</p>
            <p class="text-xs text-muted-foreground">{{ fmt(v.scheduled_for) }} · {{ v.customers?.trade_name }}</p>
          </li>
        </ul>
      </Card>
    </div>
  </div>
</template>
