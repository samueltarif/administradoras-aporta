<script setup lang="ts">
import { formatCnpj } from '#shared/utils/cnpj'

definePageMeta({ layout: 'admin', middleware: ['staff'] })
useHead({ title: 'Administradoras · Painel A Porta Móvel' })

interface Row { id: string, trade_name: string, legal_name: string | null, cnpj: string | null, legacy_code: string | null, active: boolean }
const { access } = useAccess()
const { filters, q, page, data, loading, error } = useAdminList<Row>('/api/admin/management-companies', { active: 'all', pageSize: '20' })
</script>

<template>
  <div>
    <AppPageHeader title="Administradoras" description="Empresas que administram condomínios atendidos.">
      <template #actions>
        <Button v-if="access?.staffRole === 'owner'" as-child>
          <NuxtLink to="/admin/administradoras/nova"><Icon name="lucide:plus" /> Nova administradora</NuxtLink>
        </Button>
      </template>
    </AppPageHeader>
    <Card class="gap-0 py-0">
      <div class="flex flex-col gap-3 border-b p-3 sm:flex-row">
        <div class="relative flex-1">
          <Icon name="lucide:search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="q" placeholder="Buscar por nome, código legado ou CNPJ" class="pl-9" aria-label="Buscar" />
        </div>
        <NativeSelect v-model="filters.active" class="sm:w-44" aria-label="Situação">
          <option value="all">Todas</option>
          <option value="true">Ativas</option>
          <option value="false">Inativas</option>
        </NativeSelect>
      </div>
      <AppFormAlert v-if="error" class="m-3">
        {{ apiErrorMessage(error) }}
      </AppFormAlert>
      <div v-else-if="loading && !data" class="space-y-2 p-3">
        <Skeleton v-for="i in 6" :key="i" class="h-10 w-full" />
      </div>
      <AppEmptyState v-else-if="!data?.items.length" title="Nenhuma administradora encontrada" description="Ajuste a busca ou os filtros." icon="lucide:briefcase-business" />
      <Table v-else :class="loading && 'opacity-60'">
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead class="hidden md:table-cell">CNPJ</TableHead>
            <TableHead class="hidden sm:table-cell">Código legado</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in data.items" :key="row.id" class="cursor-pointer" @click="navigateTo(`/admin/administradoras/${row.id}`)">
            <TableCell>
              <NuxtLink :to="`/admin/administradoras/${row.id}`" class="font-medium text-brand-blue hover:underline" @click.stop>
                {{ row.trade_name }}
              </NuxtLink>
              <p v-if="row.legal_name" class="text-xs text-muted-foreground">{{ row.legal_name }}</p>
            </TableCell>
            <TableCell class="hidden tabular-nums md:table-cell">{{ formatCnpj(row.cnpj) || '—' }}</TableCell>
            <TableCell class="hidden sm:table-cell">{{ row.legacy_code ?? '—' }}</TableCell>
            <TableCell>
              <Badge :variant="row.active ? 'success' : 'muted'">{{ row.active ? 'Ativa' : 'Inativa' }}</Badge>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <AppPagination v-if="data?.total" v-model:page="page" :page-size="data.pageSize" :total="data.total" />
    </Card>
  </div>
</template>
