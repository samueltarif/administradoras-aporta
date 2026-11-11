<script setup lang="ts">
import type { TicketDetail } from './types'
import { CATEGORY_LABEL } from '#shared/domain/labels'
import TicketAttachments from './TicketAttachments.vue'
import TicketComposer from './TicketComposer.vue'
import TicketCustomerActions from './TicketCustomerActions.vue'
import TicketStaffPanel from './TicketStaffPanel.vue'
import TicketStatusBadge from './TicketStatusBadge.vue'
import TicketTimeline from './TicketTimeline.vue'

const props = defineProps<{ id: string, listPath: string, listLabel: string }>()
const { data, error, refresh } = await useFetch<TicketDetail>(() => `/api/tickets/${props.id}`)
useHead({ title: () => (data.value ? `#${data.value.ticket.number} ${data.value.ticket.title}` : 'Chamado') })
const t = computed(() => data.value?.ticket)
const isFinal = computed(() => ['closed', 'cancelled'].includes(t.value?.status ?? ''))
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—')
</script>

<template>
  <div>
    <AppFormAlert v-if="error">{{ apiErrorMessage(error, 'Chamado não encontrado ou sem permissão.') }}</AppFormAlert>
    <template v-else-if="data && t">
      <AppPageHeader :title="`#${t.number} · ${t.title}`" :crumbs="[{ label: listLabel, to: listPath }, { label: `#${t.number}` }]">
        <template #actions>
          <TicketStatusBadge :status="t.status" />
          <TicketStatusBadge :priority="t.priority" />
        </template>
      </AppPageHeader>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div class="space-y-6">
          <Card>
            <CardContent class="space-y-4">
              <dl class="grid gap-3 text-sm sm:grid-cols-3">
                <div><dt class="text-muted-foreground">Cliente</dt><dd class="font-medium">{{ t.customers?.trade_name }}</dd></div>
                <div><dt class="text-muted-foreground">Categoria</dt><dd>{{ CATEGORY_LABEL[t.category] }}</dd></div>
                <div><dt class="text-muted-foreground">Local</dt><dd>{{ t.location_detail || '—' }}</dd></div>
                <div><dt class="text-muted-foreground">Aberto por</dt><dd>{{ data.names[t.created_by] ?? '—' }}</dd></div>
                <div><dt class="text-muted-foreground">Aberto em</dt><dd>{{ fmt(t.created_at) }}</dd></div>
                <div><dt class="text-muted-foreground">Responsável</dt><dd>{{ t.assigned_to ? data.names[t.assigned_to] ?? 'Equipe' : 'A definir' }}</dd></div>
              </dl>
              <p class="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{{ t.description }}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Histórico e mensagens</CardTitle></CardHeader>
            <CardContent class="space-y-6">
              <TicketTimeline :detail="data" />
              <TicketComposer v-if="!isFinal" :ticket-id="t.id" mode="message" @sent="refresh()" />
            </CardContent>
          </Card>
          <Card v-if="data.isStaff">
            <CardHeader>
              <CardTitle class="flex items-center gap-2"><Icon name="lucide:lock" class="size-4" /> Notas internas</CardTitle>
              <CardDescription>Nunca exibidas no portal do cliente.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <ul v-if="data.notes.length" class="space-y-2">
                <li v-for="n in data.notes" :key="n.id" class="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm">
                  <p class="text-xs text-muted-foreground">{{ data.names[n.author_id] ?? 'Equipe' }} · {{ fmt(n.created_at) }}</p>
                  <p class="whitespace-pre-line">{{ n.body }}</p>
                </li>
              </ul>
              <TicketComposer :ticket-id="t.id" mode="note" @sent="refresh()" />
            </CardContent>
          </Card>
        </div>
        <div class="space-y-6">
          <Card v-if="data.isStaff">
            <CardHeader><CardTitle>Atendimento</CardTitle></CardHeader>
            <CardContent><TicketStaffPanel :ticket="t" @changed="refresh()" /></CardContent>
          </Card>
          <Card v-else>
            <CardHeader><CardTitle>Ações</CardTitle></CardHeader>
            <CardContent><TicketCustomerActions :ticket-id="t.id" :status="t.status" @changed="refresh()" /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Anexos</CardTitle></CardHeader>
            <CardContent><TicketAttachments :ticket-id="t.id" :items="data.attachments" :is-staff="data.isStaff" :can-upload="!isFinal" @changed="refresh()" /></CardContent>
          </Card>
          <Card v-if="data.visits.length">
            <CardHeader><CardTitle>Visitas</CardTitle></CardHeader>
            <CardContent>
              <ul class="space-y-2 text-sm">
                <li v-for="v in data.visits" :key="v.id"><strong>{{ fmt(v.scheduled_for) }}</strong> — {{ v.title }}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>
  </div>
</template>
