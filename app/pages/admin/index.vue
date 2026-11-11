<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['staff'] })
// NuxtLink não é registrado globalmente: resolve no setup para usar em <component :is>.
const NuxtLink = resolveComponent('NuxtLink')
useHead({ title: 'Visão geral · Painel A Porta Móvel' })

interface Stats {
  customers: number, unclassified: number, managementCompanies: number, activeAssignments: number
  openTickets: number, emergencyTickets: number, activeContracts: number, upcomingVisits: number
}
const { data, status, error, refresh } = useFetch<Stats>('/api/admin/stats')
const cards = computed(() => {
  const s = data.value
  return [
    { label: 'Clientes ativos', value: s?.customers, icon: 'lucide:building-2', to: '/admin/clientes?active=true' },
    { label: 'A classificar', value: s?.unclassified, icon: 'lucide:tag', to: '/admin/clientes?kind=unclassified', tone: s?.unclassified ? 'warning' : '' },
    { label: 'Administradoras ativas', value: s?.managementCompanies, icon: 'lucide:briefcase-business', to: '/admin/administradoras?active=true' },
    { label: 'Vínculos ativos', value: s?.activeAssignments, icon: 'lucide:link' },
    { label: 'Chamados em aberto', value: s?.openTickets, icon: 'lucide:wrench' },
    { label: 'Emergências abertas', value: s?.emergencyTickets, icon: 'lucide:siren', tone: s?.emergencyTickets ? 'danger' : '' },
    { label: 'Contratos ativos', value: s?.activeContracts, icon: 'lucide:file-check-2' },
    { label: 'Visitas agendadas', value: s?.upcomingVisits, icon: 'lucide:calendar-clock' },
  ]
})
</script>

<template>
  <div>
    <AppPageHeader title="Visão geral" description="Indicadores calculados em tempo real a partir do banco." />
    <AppFormAlert v-if="error">
      Não foi possível carregar os indicadores.
      <button class="ml-1 font-medium underline" @click="() => refresh()">Tentar novamente</button>
    </AppFormAlert>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <component
        :is="card.to ? NuxtLink : 'div'"
        v-for="card in cards"
        :key="card.label"
        :to="card.to"
        class="rounded-xl border bg-card p-5 shadow-sm transition-shadow"
        :class="[card.to && 'hover:shadow-md', card.tone === 'danger' && 'border-red-200', card.tone === 'warning' && 'border-amber-200']"
      >
        <div class="flex items-start justify-between">
          <p class="text-sm text-muted-foreground">
            {{ card.label }}
          </p>
          <Icon :name="card.icon" class="size-5" :class="card.tone === 'danger' ? 'text-brand-red' : 'text-brand-blue'" />
        </div>
        <Skeleton v-if="status === 'pending'" class="mt-3 h-8 w-20" />
        <p v-else class="mt-2 text-3xl font-semibold tabular-nums">
          {{ (card.value ?? 0).toLocaleString('pt-BR') }}
        </p>
      </component>
    </div>
  </div>
</template>
