<script setup lang="ts">
import type { TicketPriority, TicketStatus } from '~/types/database.types'
import TicketStatusBadge from './TicketStatusBadge.vue'

export interface TicketRowItem {
  id: string, number: number, title: string, status: TicketStatus, priority: TicketPriority
  created_at: string, updated_at: string, customers: { id: string, trade_name: string } | null
}
defineProps<{ items: TicketRowItem[], basePath: string, loading?: boolean }>()
const fmt = (d: string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
</script>

<template>
  <Table :class="loading && 'opacity-60'">
    <TableHeader>
      <TableRow>
        <TableHead class="w-16">Nº</TableHead>
        <TableHead>Chamado</TableHead>
        <TableHead>Situação</TableHead>
        <TableHead class="hidden md:table-cell">Prioridade</TableHead>
        <TableHead class="hidden lg:table-cell">Atualizado</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow v-for="t in items" :key="t.id" class="cursor-pointer" @click="navigateTo(`${basePath}/${t.id}`)">
        <TableCell class="tabular-nums text-muted-foreground">#{{ t.number }}</TableCell>
        <TableCell>
          <NuxtLink :to="`${basePath}/${t.id}`" class="font-medium text-brand-blue hover:underline" @click.stop>{{ t.title }}</NuxtLink>
          <p class="text-xs text-muted-foreground">{{ t.customers?.trade_name }}</p>
        </TableCell>
        <TableCell><TicketStatusBadge :status="t.status" /></TableCell>
        <TableCell class="hidden md:table-cell"><TicketStatusBadge :priority="t.priority" /></TableCell>
        <TableCell class="hidden text-sm text-muted-foreground lg:table-cell">{{ fmt(t.updated_at) }}</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
