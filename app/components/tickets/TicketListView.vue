<script setup lang="ts">
import type { TicketRowItem } from './TicketTable.vue'
import { PRIORITY_LABEL, STATUS_LABEL, TICKET_PRIORITIES, TICKET_STATUSES } from '#shared/domain/labels'
import TicketTable from './TicketTable.vue'

const props = defineProps<{ basePath: string, newPath?: string }>()
const { filters, q, page, data, loading, error } = useAdminList<TicketRowItem>('/api/tickets', { status: 'active', priority: 'all', customer: '', pageSize: '20' })
const { data: customers } = useFetch<{ id: string, trade_name: string }[]>('/api/lookups/customers', { default: () => [] })
</script>

<template>
  <Card class="gap-0 py-0">
    <div class="grid gap-3 border-b p-3 md:grid-cols-[minmax(0,1fr)_11rem_10rem_14rem]">
      <div class="relative">
        <Icon name="lucide:search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="q" placeholder="Buscar por título ou nº" class="pl-9" aria-label="Buscar" />
      </div>
      <NativeSelect v-model="filters.status" aria-label="Situação">
        <option value="active">Em aberto</option>
        <option value="all">Todas as situações</option>
        <option v-for="s in TICKET_STATUSES" :key="s" :value="s">{{ STATUS_LABEL[s] }}</option>
      </NativeSelect>
      <NativeSelect v-model="filters.priority" aria-label="Prioridade">
        <option value="all">Todas as prioridades</option>
        <option v-for="p in TICKET_PRIORITIES" :key="p" :value="p">{{ PRIORITY_LABEL[p] }}</option>
      </NativeSelect>
      <NativeSelect v-model="filters.customer" aria-label="Cliente">
        <option value="">Todos os clientes</option>
        <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.trade_name }}</option>
      </NativeSelect>
    </div>
    <AppFormAlert v-if="error" class="m-3">{{ apiErrorMessage(error) }}</AppFormAlert>
    <div v-else-if="loading && !data" class="space-y-2 p-3">
      <Skeleton v-for="i in 6" :key="i" class="h-10 w-full" />
    </div>
    <AppEmptyState v-else-if="!data?.items.length" title="Nenhum chamado encontrado" description="Ajuste os filtros ou abra um novo chamado." icon="lucide:wrench">
      <Button v-if="props.newPath" as-child size="sm" class="mt-2"><NuxtLink :to="props.newPath">Abrir chamado</NuxtLink></Button>
    </AppEmptyState>
    <TicketTable v-else :items="data.items" :base-path="basePath" :loading="loading" />
    <AppPagination v-if="data?.total" v-model:page="page" :page-size="data.pageSize" :total="data.total" />
  </Card>
</template>
