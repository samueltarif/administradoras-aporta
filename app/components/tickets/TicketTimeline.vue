<script setup lang="ts">
import type { TicketDetail } from './types'
import { STATUS_LABEL } from '#shared/domain/labels'

const props = defineProps<{ detail: TicketDetail }>()
const fmt = (d: string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const who = (id: string | null) => (id ? props.detail.names[id] ?? 'Usuário' : 'Sistema')

// Mensagens públicas e mudanças de status em uma linha do tempo única, em ordem cronológica.
const items = computed(() => [
  ...props.detail.history.map(h => ({ key: `h${h.id}`, at: h.changed_at, kind: 'status' as const, author: who(h.actor_id),
    text: h.old_status ? `${STATUS_LABEL[h.old_status]} → ${STATUS_LABEL[h.new_status]}` : `Chamado aberto (${STATUS_LABEL[h.new_status]})` })),
  ...props.detail.messages.map(m => ({ key: `m${m.id}`, at: m.created_at, kind: 'message' as const, author: who(m.author_id), text: m.body })),
].sort((a, b) => a.at.localeCompare(b.at)))
</script>

<template>
  <ol class="space-y-4" aria-label="Histórico do chamado">
    <li v-for="i in items" :key="i.key" class="flex gap-3">
      <span class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full" :class="i.kind === 'status' ? 'bg-accent text-brand-blue' : 'bg-red-50 text-brand-red'">
        <Icon :name="i.kind === 'status' ? 'lucide:git-commit-horizontal' : 'lucide:message-square'" class="size-4" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-xs text-muted-foreground"><strong class="text-foreground">{{ i.author }}</strong> · {{ fmt(i.at) }}</p>
        <p v-if="i.kind === 'status'" class="text-sm">{{ i.text }}</p>
        <p v-else class="mt-1 rounded-lg border bg-white px-3 py-2 text-sm whitespace-pre-line">{{ i.text }}</p>
      </div>
    </li>
  </ol>
</template>
