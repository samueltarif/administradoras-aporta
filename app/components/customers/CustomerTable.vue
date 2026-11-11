<script setup lang="ts">
import type { CustomerListItem } from './types'
import { CUSTOMER_KIND_LABEL } from '#shared/schemas/registry'
import { formatCnpj } from '#shared/utils/cnpj'

defineProps<{ items: CustomerListItem[], loading?: boolean }>()
const kindVariant = (k: CustomerListItem['customer_kind']) => (k === 'unclassified' ? 'warning' : 'info')
</script>

<template>
  <Table :class="loading && 'opacity-60'">
    <TableHeader>
      <TableRow>
        <TableHead>Cliente</TableHead>
        <TableHead>Tipo</TableHead>
        <TableHead class="hidden lg:table-cell">Administradora</TableHead>
        <TableHead class="hidden md:table-cell">CNPJ</TableHead>
        <TableHead class="hidden sm:table-cell">Código</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow v-for="row in items" :key="row.id" class="cursor-pointer" @click="navigateTo(`/admin/clientes/${row.id}`)">
        <TableCell>
          <NuxtLink :to="`/admin/clientes/${row.id}`" class="font-medium text-brand-blue hover:underline" @click.stop>{{ row.trade_name }}</NuxtLink>
          <Badge v-if="!row.active" variant="muted" class="ml-2">Inativo</Badge>
          <p v-if="row.legal_name" class="text-xs text-muted-foreground">{{ row.legal_name }}</p>
        </TableCell>
        <TableCell><Badge :variant="kindVariant(row.customer_kind)">{{ CUSTOMER_KIND_LABEL[row.customer_kind] }}</Badge></TableCell>
        <TableCell class="hidden lg:table-cell">
          <span v-if="row.management">{{ row.management.trade_name }}</span>
          <span v-else class="text-muted-foreground">Sem vínculo</span>
        </TableCell>
        <TableCell class="hidden tabular-nums md:table-cell">{{ formatCnpj(row.cnpj) || '—' }}</TableCell>
        <TableCell class="hidden sm:table-cell">{{ row.legacy_code ?? '—' }}</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
