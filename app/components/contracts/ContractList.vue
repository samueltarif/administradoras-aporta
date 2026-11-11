<script setup lang="ts">
import type { ContractStatus, Frequency } from '~/types/database.types'
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUSES, FREQUENCY_LABEL } from '#shared/domain/labels'

interface Row {
  id: string, contract_number: string | null, title: string, status: ContractStatus, maintenance_frequency: Frequency | null
  starts_on: string | null, ends_on: string | null, customers: { trade_name: string } | null
  management_companies: { trade_name: string } | null, contract_financials: { monthly_value: number | null } | null
}
defineProps<{ basePath: string, showValue?: boolean }>()
const { filters, page, data, loading, error } = useAdminList<Row>('/api/contracts', { status: 'all', pageSize: '20' })
const money = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const date = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—')
const tone = (s: ContractStatus) => (s === 'active' ? 'success' : s === 'suspended' ? 'warning' : 'muted')
</script>

<template>
  <Card class="gap-0 py-0">
    <div class="border-b p-3">
      <NativeSelect v-model="filters.status" class="sm:w-56" aria-label="Situação">
        <option value="all">Todas as situações</option>
        <option v-for="s in CONTRACT_STATUSES" :key="s" :value="s">{{ CONTRACT_STATUS_LABEL[s] }}</option>
      </NativeSelect>
    </div>
    <AppFormAlert v-if="error" class="m-3">{{ apiErrorMessage(error) }}</AppFormAlert>
    <div v-else-if="loading && !data" class="space-y-2 p-3"><Skeleton v-for="i in 5" :key="i" class="h-10" /></div>
    <AppEmptyState v-else-if="!data?.items.length" title="Nenhum contrato" icon="lucide:file-check-2" />
    <Table v-else>
      <TableHeader>
        <TableRow>
          <TableHead>Contrato</TableHead><TableHead>Situação</TableHead>
          <TableHead class="hidden md:table-cell">Periodicidade</TableHead><TableHead class="hidden lg:table-cell">Vigência</TableHead>
          <TableHead v-if="showValue" class="text-right">Valor mensal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="c in data.items" :key="c.id" class="cursor-pointer" @click="navigateTo(`${basePath}/${c.id}`)">
          <TableCell>
            <NuxtLink :to="`${basePath}/${c.id}`" class="font-medium text-brand-blue hover:underline" @click.stop>{{ c.title }}</NuxtLink>
            <p class="text-xs text-muted-foreground">{{ c.customers?.trade_name }}<template v-if="c.contract_number"> · {{ c.contract_number }}</template></p>
          </TableCell>
          <TableCell><Badge :variant="tone(c.status)">{{ CONTRACT_STATUS_LABEL[c.status] }}</Badge></TableCell>
          <TableCell class="hidden md:table-cell">{{ c.maintenance_frequency ? FREQUENCY_LABEL[c.maintenance_frequency] : '—' }}</TableCell>
          <TableCell class="hidden text-sm lg:table-cell">{{ date(c.starts_on) }} → {{ date(c.ends_on) }}</TableCell>
          <TableCell v-if="showValue" class="text-right tabular-nums">{{ money(c.contract_financials?.monthly_value) }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <AppPagination v-if="data?.total" v-model:page="page" :page-size="data.pageSize" :total="data.total" />
  </Card>
</template>
