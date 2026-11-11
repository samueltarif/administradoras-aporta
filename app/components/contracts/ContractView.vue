<script setup lang="ts">
import type { ContractStatus, Frequency, VisitStatus } from '~/types/database.types'
import { CONTRACT_STATUS_LABEL, FREQUENCY_LABEL, VISIT_STATUS_LABEL } from '#shared/domain/labels'

interface Detail {
  contract: { id: string, title: string, contract_number: string | null, description: string | null, status: ContractStatus
    maintenance_frequency: Frequency | null, starts_on: string | null, ends_on: string | null, contractor_type: 'customer' | 'management'
    customers: { id: string, trade_name: string } | null, management_companies: { trade_name: string } | null }
  financial: { monthly_value: number | null, billing_notes: string | null } | null
  visits: { id: string, title: string, scheduled_for: string | null, status: VisitStatus }[]
}
const props = defineProps<{ id: string }>()
const { data, error } = await useFetch<Detail>(() => `/api/contracts/${props.id}`)
const date = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—')
</script>

<template>
  <AppFormAlert v-if="error">{{ apiErrorMessage(error, 'Contrato não encontrado ou sem permissão.') }}</AppFormAlert>
  <div v-else-if="data" class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
    <Card>
      <CardContent>
        <dl class="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt class="text-muted-foreground">Cliente atendido</dt><dd class="font-medium">{{ data.contract.customers?.trade_name }}</dd></div>
          <div><dt class="text-muted-foreground">Contratante</dt><dd>{{ data.contract.contractor_type === 'management' ? data.contract.management_companies?.trade_name : 'O próprio cliente' }}</dd></div>
          <div><dt class="text-muted-foreground">Situação</dt><dd>{{ CONTRACT_STATUS_LABEL[data.contract.status] }}</dd></div>
          <div><dt class="text-muted-foreground">Periodicidade das preventivas</dt><dd>{{ data.contract.maintenance_frequency ? FREQUENCY_LABEL[data.contract.maintenance_frequency] : '—' }}</dd></div>
          <div><dt class="text-muted-foreground">Vigência</dt><dd>{{ date(data.contract.starts_on) }} → {{ date(data.contract.ends_on) }}</dd></div>
          <div><dt class="text-muted-foreground">Número</dt><dd>{{ data.contract.contract_number ?? '—' }}</dd></div>
          <div v-if="data.financial" class="sm:col-span-2"><dt class="text-muted-foreground">Valor mensal (restrito)</dt>
            <dd class="font-medium">{{ data.financial.monthly_value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—' }}</dd></div>
        </dl>
        <p v-if="data.contract.description" class="mt-4 rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{{ data.contract.description }}</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Visitas do contrato</CardTitle></CardHeader>
      <CardContent>
        <p v-if="!data.visits.length" class="text-sm text-muted-foreground">Nenhuma visita registrada.</p>
        <ul v-else class="space-y-2 text-sm">
          <li v-for="v in data.visits" :key="v.id"><strong>{{ v.scheduled_for ? new Date(v.scheduled_for).toLocaleDateString('pt-BR') : '—' }}</strong> {{ v.title }} · <span class="text-muted-foreground">{{ VISIT_STATUS_LABEL[v.status] }}</span></li>
        </ul>
      </CardContent>
    </Card>
  </div>
</template>
