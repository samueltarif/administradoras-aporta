<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['owner'] })
useHead({ title: 'Auditoria · Painel A Porta Móvel' })
interface Row { id: number, action: string, entity_name: string, entity_id: string | null, details: { changed?: string[] }, created_at: string, user_profiles: { display_name: string | null } | null }
const { filters, page, data, loading } = useAdminList<Row>('/api/admin/audit', { entity: '' })
const entities = ['customers', 'management_companies', 'management_assignments', 'user_profiles', 'staff_memberships', 'management_memberships', 'customer_memberships', 'service_contracts', 'contract_financials']
const ACTION: Record<string, string> = { insert: 'Criação', update: 'Alteração', delete: 'Exclusão' }
</script>

<template>
  <div>
    <AppPageHeader title="Auditoria" description="Ações sobre cadastros, vínculos, acessos e contratos. Dados pessoais não são gravados na trilha." />
    <Card class="gap-0 py-0">
      <div class="border-b p-3">
        <NativeSelect v-model="filters.entity" class="sm:w-72" aria-label="Entidade">
          <option value="">Todas as entidades</option><option v-for="e in entities" :key="e" :value="e">{{ e }}</option>
        </NativeSelect>
      </div>
      <Table :class="loading && 'opacity-60'">
        <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Quem</TableHead><TableHead>Ação</TableHead><TableHead class="hidden md:table-cell">Detalhe</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow v-for="r in data?.items" :key="r.id">
            <TableCell class="text-sm whitespace-nowrap">{{ new Date(r.created_at).toLocaleString('pt-BR') }}</TableCell>
            <TableCell class="text-sm">{{ r.user_profiles?.display_name ?? 'Sistema / importação' }}</TableCell>
            <TableCell class="text-sm">{{ ACTION[r.action] ?? r.action }} · <code class="text-xs">{{ r.entity_name }}</code></TableCell>
            <TableCell class="hidden text-xs text-muted-foreground md:table-cell">{{ r.details?.changed?.join(', ') ?? r.entity_id }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <AppPagination v-if="data?.total" v-model:page="page" :page-size="50" :total="data.total" />
    </Card>
  </div>
</template>
