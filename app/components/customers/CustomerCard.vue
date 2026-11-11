<script setup lang="ts">
import type { CustomerListItem } from './types'
import { CONTRACT_STATUS_LABEL } from '#shared/domain/labels'
import { CUSTOMER_KIND_LABEL } from '#shared/schemas/registry'
import { formatCnpj } from '#shared/utils/cnpj'

// Decisão de UX: só condomínios recebem a ilustração de edifícios; os demais tipos usam um
// cabeçalho com ícone (não representar empresa/pessoa como prédio residencial).
const props = defineProps<{ item: CustomerListItem }>()
const isCondo = computed(() => props.item.customer_kind === 'condominium')
const kindIcon = { condominium: 'lucide:building-2', business: 'lucide:store', person: 'lucide:user-round', unclassified: 'lucide:circle-help' } as const
const contract = computed(() => {
  const s = props.item.summary?.contract
  if (!s) return null
  return s === 'none' ? { label: 'Sem contrato', tone: 'muted' as const } : { label: `Contrato ${CONTRACT_STATUS_LABEL[s].toLowerCase()}`, tone: s === 'active' ? 'success' as const : s === 'suspended' ? 'warning' as const : 'muted' as const }
})
const href = computed(() => `/admin/clientes/${props.item.id}`)
</script>

<template>
  <article class="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-[box-shadow,transform] duration-200 focus-within:ring-[3px] focus-within:ring-ring/50 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
    <div class="relative aspect-[3/2] overflow-hidden border-b" :class="isCondo ? 'bg-gradient-to-b from-slate-50 to-slate-100' : 'bg-muted'">
      <img
v-if="isCondo" src="/animation/condominio_3d_poster.webp" alt="" width="960" height="640" loading="lazy" decoding="async"
        class="size-full object-contain p-3 drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none">
      <div v-else class="grid size-full place-items-center">
        <span class="grid size-14 place-items-center rounded-2xl bg-white text-brand-blue shadow-sm ring-1 ring-border">
          <Icon :name="kindIcon[item.customer_kind]" class="size-7" />
        </span>
      </div>
      <Badge v-if="!item.active" variant="muted" class="absolute top-2 left-2">Inativo</Badge>
    </div>
    <div class="flex flex-1 flex-col gap-3 p-4">
      <div class="space-y-1.5">
        <div class="flex flex-wrap items-center gap-1.5">
          <Badge :variant="item.customer_kind === 'unclassified' ? 'warning' : 'info'">{{ CUSTOMER_KIND_LABEL[item.customer_kind] }}</Badge>
          <Badge v-if="item.active" variant="success">Ativo</Badge>
        </div>
        <h3 class="line-clamp-2 leading-snug font-semibold text-foreground" :title="item.trade_name">{{ item.trade_name }}</h3>
      </div>
      <ul class="space-y-1 text-sm">
        <li class="flex items-center gap-2">
          <Icon name="lucide:briefcase-business" class="size-4 shrink-0 text-muted-foreground" />
          <span class="sr-only">Administradora:</span>
          <span class="truncate" :class="!item.management && 'text-muted-foreground'">{{ item.management?.trade_name ?? 'Sem administradora' }}</span>
        </li>
        <li class="flex items-center gap-2">
          <Icon name="lucide:map-pin" class="size-4 shrink-0 text-muted-foreground" />
          <span class="sr-only">Endereço:</span>
          <span class="truncate" :class="!item.address_text && 'text-muted-foreground'">{{ item.address_text || 'Endereço não informado' }}</span>
        </li>
        <li v-if="item.cnpj || item.legacy_code" class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span v-if="item.cnpj">CNPJ <span class="tabular-nums">{{ formatCnpj(item.cnpj) }}</span></span>
          <span v-if="item.legacy_code">Código legado {{ item.legacy_code }}</span>
        </li>
      </ul>
      <div class="mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <div class="flex flex-wrap gap-1.5 text-xs">
          <span v-if="item.summary" class="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5" :class="item.summary.openTickets > 0 ? 'bg-red-50 text-brand-red' : ''">
            <Icon name="lucide:wrench" class="size-3.5" />{{ item.summary.openTickets }} em aberto
          </span>
          <Badge v-if="contract" :variant="contract.tone">{{ contract.label }}</Badge>
        </div>
        <!-- Link "esticado": o card inteiro é clicável sem elementos interativos aninhados -->
        <NuxtLink :to="href" class="shrink-0 text-sm font-medium text-brand-blue outline-none after:absolute after:inset-0 after:content-[''] hover:underline">
          Abrir cadastro<span class="sr-only">: {{ item.trade_name }}</span>
        </NuxtLink>
      </div>
    </div>
  </article>
</template>
