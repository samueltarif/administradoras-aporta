<script setup lang="ts">
import { customerSchema } from '#shared/schemas/registry'
import AssignmentEditor from '~/components/admin/AssignmentEditor.vue'
import RegistryFields from '~/components/admin/RegistryFields.vue'
import CondoViewer from '~/components/viewer/CondoViewer.vue'

definePageMeta({ layout: 'admin', middleware: ['staff'] })

interface Assignment {
  id: string, recorded_at: string, effective_from: string | null, ended_at: string | null, source_system: string
  management_companies: { id: string, trade_name: string } | null
}
interface Detail {
  customer: Record<string, string | boolean | null> & { id: string, trade_name: string, legacy_code: string | null }
  assignments: Assignment[], ticketsTotal: number, contractsTotal: number
}
const route = useRoute()
const { access } = useAccess()
const canEdit = computed(() => access.value?.staffRole === 'owner')
const { data, error, refresh } = await useFetch<Detail>(() => `/api/admin/customers/${route.params.id}`)
useHead({ title: () => `${data.value?.customer.trade_name ?? 'Cliente'} · Painel A Porta Móvel` })

const { form, errors, saving, submit, reset } = useRegistryForm(customerSchema, toFormState(data.value?.customer, true))
watch(() => data.value?.customer, c => c && reset(toFormState(c, true)))
const current = computed(() => data.value?.assignments.find(a => !a.ended_at) ?? null)
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : 'data desconhecida')

async function save() {
  const ok = await submit(payload => api(`/api/admin/customers/${route.params.id}`, { method: 'PATCH', body: payload }), 'Alterações salvas.')
  if (ok) await refresh()
}
</script>

<template>
  <div>
    <AppFormAlert v-if="error">
      {{ apiErrorMessage(error, 'Cliente não encontrado.') }}
    </AppFormAlert>
    <template v-else-if="data">
      <AppPageHeader :title="data.customer.trade_name" :crumbs="[{ label: 'Clientes', to: '/admin/clientes' }, { label: data.customer.trade_name }]">
        <template #actions>
          <Badge v-if="data.customer.legacy_code" variant="info">Código legado {{ data.customer.legacy_code }}</Badge>
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
              <RegistryFields v-model="form" :errors="errors" with-kind :disabled="!canEdit" />
              <div v-if="canEdit" class="flex justify-end">
                <Button type="submit" :disabled="saving">{{ saving ? 'Salvando…' : 'Salvar alterações' }}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <div class="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Administradora</CardTitle>
              <CardDescription>
                {{ current ? 'Vínculo ativo.' : 'Sem administradora: atende como independente. A ausência de vínculo no legado precisa de validação humana.' }}
              </CardDescription>
            </CardHeader>
            <CardContent v-if="current?.management_companies">
              <NuxtLink :to="`/admin/administradoras/${current.management_companies.id}`" class="font-medium text-brand-blue hover:underline">
                {{ current.management_companies.trade_name }}
              </NuxtLink>
              <p class="mt-1 text-xs text-muted-foreground">Desde {{ fmt(current.effective_from) }} · origem {{ current.source_system }}</p>
            </CardContent>
            <CardContent v-if="canEdit">
              <AssignmentEditor :customer-id="data.customer.id" :current-id="current?.management_companies?.id ?? null" @changed="refresh()" />
            </CardContent>
          </Card>
          <Card v-if="data.assignments.some(a => a.ended_at)">
            <CardHeader><CardTitle>Histórico de vínculos</CardTitle></CardHeader>
            <CardContent>
              <ol class="space-y-3 text-sm">
                <li v-for="a in data.assignments.filter(x => x.ended_at)" :key="a.id">
                  <span class="font-medium">{{ a.management_companies?.trade_name ?? '—' }}</span>
                  <span class="block text-xs text-muted-foreground">{{ fmt(a.effective_from) }} → {{ fmt(a.ended_at) }}</span>
                </li>
              </ol>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="grid grid-cols-2 gap-4 text-center">
              <div><p class="text-2xl font-semibold">{{ data.ticketsTotal }}</p><p class="text-xs text-muted-foreground">Chamados</p></div>
              <div><p class="text-2xl font-semibold">{{ data.contractsTotal }}</p><p class="text-xs text-muted-foreground">Contratos</p></div>
            </CardContent>
          </Card>
        </div>
      </div>
      <!-- Somente condomínios recebem a representação de edifícios (decisão de UX). -->
      <Card v-if="data.customer.customer_kind === 'condominium'" class="mt-6">
        <CardHeader>
          <CardTitle>Visualização 3D do condomínio</CardTitle>
          <CardDescription>Representação ilustrativa e genérica — não reproduz o imóvel real. Carregada sob demanda.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="aspect-[16/9] max-h-[460px] w-full overflow-hidden rounded-xl bg-gradient-to-b from-slate-50 to-slate-200 ring-1 ring-border">
            <ClientOnly>
              <CondoViewer load-on="click" show-reset />
              <template #fallback>
                <img src="/animation/condominio_3d_poster.webp" alt="" width="960" height="640" class="size-full object-contain">
              </template>
            </ClientOnly>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
