<script setup lang="ts">
import { CUSTOMER_KIND_LABEL, managementCompanySchema } from '#shared/schemas/registry'
import RegistryFields from '~/components/admin/RegistryFields.vue'

definePageMeta({ layout: 'admin', middleware: ['staff'] })

interface Linked { id: string, recorded_at: string, customers: { id: string, trade_name: string, customer_kind: keyof typeof CUSTOMER_KIND_LABEL, active: boolean } | null }
interface Detail { company: Record<string, string | boolean | null> & { id: string, trade_name: string, legacy_code: string | null, legacy_source: string | null }, customers: Linked[], customersTotal: number }

const route = useRoute()
const { access } = useAccess()
const canEdit = computed(() => access.value?.staffRole === 'owner')
const { data, error, refresh } = await useFetch<Detail>(() => `/api/admin/management-companies/${route.params.id}`)
useHead({ title: () => `${data.value?.company.trade_name ?? 'Administradora'} · Painel A Porta Móvel` })

const { form, errors, saving, submit, reset } = useRegistryForm(managementCompanySchema, toFormState(data.value?.company, false))
watch(() => data.value?.company, c => c && reset(toFormState(c, false)))

async function save() {
  const ok = await submit(payload => api(`/api/admin/management-companies/${route.params.id}`, { method: 'PATCH', body: payload }), 'Alterações salvas.')
  if (ok) await refresh()
}
</script>

<template>
  <div>
    <AppFormAlert v-if="error">
      {{ apiErrorMessage(error, 'Administradora não encontrada.') }}
    </AppFormAlert>
    <template v-else-if="data">
      <AppPageHeader :title="data.company.trade_name" :crumbs="[{ label: 'Administradoras', to: '/admin/administradoras' }, { label: data.company.trade_name }]">
        <template #actions>
          <Badge v-if="data.company.legacy_code" variant="info">Código legado {{ data.company.legacy_code }}</Badge>
        </template>
      </AppPageHeader>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Dados cadastrais</CardTitle>
            <CardDescription v-if="!canEdit">Somente o proprietário pode editar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form novalidate class="space-y-6" @submit.prevent="save">
              <RegistryFields v-model="form" :errors="errors" :disabled="!canEdit" />
              <div v-if="canEdit" class="flex justify-end">
                <Button type="submit" :disabled="saving">{{ saving ? 'Salvando…' : 'Salvar alterações' }}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card class="gap-0 py-0">
          <CardHeader class="border-b py-4">
            <CardTitle>Clientes vinculados ({{ data.customersTotal }})</CardTitle>
            <CardDescription>Vínculos ativos com esta administradora.</CardDescription>
          </CardHeader>
          <AppEmptyState v-if="!data.customers.length" title="Nenhum cliente vinculado" icon="lucide:link-2-off" />
          <ul v-else class="divide-y">
            <li v-for="l in data.customers" :key="l.id" class="flex items-center justify-between gap-3 px-6 py-3">
              <NuxtLink v-if="l.customers" :to="`/admin/clientes/${l.customers.id}`" class="font-medium text-brand-blue hover:underline">
                {{ l.customers.trade_name }}
              </NuxtLink>
              <Badge v-if="l.customers" variant="muted">{{ CUSTOMER_KIND_LABEL[l.customers.customer_kind] }}</Badge>
            </li>
          </ul>
          <p v-if="data.customersTotal > data.customers.length" class="border-t px-6 py-3 text-xs text-muted-foreground">
            Exibindo {{ data.customers.length }} de {{ data.customersTotal }}.
            <NuxtLink :to="`/admin/clientes?management=${data.company.id}`" class="font-medium text-brand-blue hover:underline">Ver todos</NuxtLink>
          </p>
        </Card>
      </div>
    </template>
  </div>
</template>
