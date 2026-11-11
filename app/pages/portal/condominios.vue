<script setup lang="ts">
import { CUSTOMER_KIND_LABEL } from '#shared/schemas/registry'

definePageMeta({ layout: 'portal', middleware: ['portal'] })
useHead({ title: 'Clientes · Portal A Porta Móvel' })
const { access } = useAccess()
const { data, status } = useFetch<{ id: string, trade_name: string, customer_kind: keyof typeof CUSTOMER_KIND_LABEL }[]>('/api/lookups/customers', { default: () => [] })
</script>

<template>
  <div>
    <AppPageHeader title="Condomínios e clientes" description="Locais aos quais você tem acesso autorizado." />
    <div v-if="access?.managements.length" class="mb-4 flex flex-wrap gap-2">
      <Badge v-for="m in access.managements" :key="m.id" variant="info">{{ m.name }}</Badge>
    </div>
    <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton v-for="i in 3" :key="i" class="h-24" /></div>
    <AppEmptyState v-else-if="!data.length" title="Nenhum cliente vinculado" icon="lucide:building-2" />
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="c in data" :key="c.id" class="gap-3 px-5 py-5">
        <div class="flex items-start justify-between gap-2">
          <p class="font-semibold">{{ c.trade_name }}</p>
          <Badge variant="muted">{{ CUSTOMER_KIND_LABEL[c.customer_kind] }}</Badge>
        </div>
        <div class="flex gap-3 text-sm">
          <NuxtLink :to="`/portal/chamados?customer=${c.id}&status=all`" class="font-medium text-brand-blue hover:underline">Chamados</NuxtLink>
          <NuxtLink :to="`/portal/chamados/novo`" class="font-medium text-brand-red hover:underline">Abrir chamado</NuxtLink>
        </div>
      </Card>
    </div>
  </div>
</template>
