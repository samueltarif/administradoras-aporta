<script setup lang="ts">
import type { CustomerListItem } from '~/components/customers/types'
import CustomerCardGrid from '~/components/customers/CustomerCardGrid.vue'
import CustomerTable from '~/components/customers/CustomerTable.vue'
import { CUSTOMER_KIND_LABEL, CUSTOMER_KINDS } from '#shared/schemas/registry'

definePageMeta({ layout: 'admin', middleware: ['staff'] })
useHead({ title: 'Clientes · Painel A Porta Móvel' })

const { access } = useAccess()
// "view" fica na URL (sobrevive a voltar/atualizar), mas não é enviado à API nem reinicia a paginação.
const { filters, q, page, data, loading, error } = useAdminList<CustomerListItem>('/api/admin/customers',
  { kind: 'all', active: 'all', management: '', pageSize: '20', include: 'summary', view: 'table' }, ['view'])
const { data: lookups } = useFetch<{ companies: { id: string, trade_name: string }[] }>('/api/admin/lookups', { default: () => ({ companies: [] }) })
const view = computed({ get: () => (filters.view === 'cards' ? 'cards' : 'table'), set: (v) => { filters.view = v } })
const views = [{ id: 'table', label: 'Tabela', icon: 'lucide:table-2' }, { id: 'cards', label: 'Cards', icon: 'lucide:layout-grid' }] as const
</script>

<template>
  <div>
    <AppPageHeader title="Clientes" description="Condomínios, empresas e pessoas atendidas. Importados começam como “A classificar”.">
      <template #actions>
        <div class="inline-flex rounded-md border bg-white p-0.5" role="group" aria-label="Modo de visualização">
          <button
v-for="v in views" :key="v.id" type="button" :aria-pressed="view === v.id"
            class="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors"
            :class="view === v.id ? 'bg-brand-blue text-white' : 'text-muted-foreground hover:text-foreground'" @click="view = v.id">
            <Icon :name="v.icon" class="size-4" />{{ v.label }}
          </button>
        </div>
        <Button v-if="access?.staffRole === 'owner'" as-child>
          <NuxtLink to="/admin/clientes/novo"><Icon name="lucide:plus" /> Novo cliente</NuxtLink>
        </Button>
      </template>
    </AppPageHeader>
    <Card class="gap-0 py-0">
      <div class="grid gap-3 border-b p-3 md:grid-cols-[minmax(0,1fr)_12rem_14rem_11rem]">
        <div class="relative">
          <Icon name="lucide:search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="q" placeholder="Buscar por nome, código legado ou CNPJ" class="pl-9" aria-label="Buscar" />
        </div>
        <NativeSelect v-model="filters.kind" aria-label="Tipo">
          <option value="all">Todos os tipos</option>
          <option v-for="k in CUSTOMER_KINDS" :key="k" :value="k">{{ CUSTOMER_KIND_LABEL[k] }}</option>
        </NativeSelect>
        <NativeSelect v-model="filters.management" aria-label="Administradora">
          <option value="">Com ou sem administradora</option>
          <option value="none">Sem administradora</option>
          <option v-for="c in lookups.companies" :key="c.id" :value="c.id">{{ c.trade_name }}</option>
        </NativeSelect>
        <NativeSelect v-model="filters.active" aria-label="Situação">
          <option value="all">Ativos e inativos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </NativeSelect>
      </div>
      <AppFormAlert v-if="error" class="m-3">{{ apiErrorMessage(error) }}</AppFormAlert>
      <template v-else-if="loading && !data">
        <CustomerCardGrid v-if="view === 'cards'" :items="[]" skeleton />
        <div v-else class="space-y-2 p-3"><Skeleton v-for="i in 8" :key="i" class="h-10 w-full" /></div>
      </template>
      <AppEmptyState v-else-if="!data?.items.length" title="Nenhum cliente encontrado" description="Ajuste a busca ou os filtros." icon="lucide:building-2" />
      <CustomerCardGrid v-else-if="view === 'cards'" :items="data.items" :loading="loading" />
      <CustomerTable v-else :items="data.items" :loading="loading" />
      <AppPagination v-if="data?.total" v-model:page="page" :page-size="data.pageSize" :total="data.total" />
    </Card>
  </div>
</template>
