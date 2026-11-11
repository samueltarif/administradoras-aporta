<script setup lang="ts">
import { onClickOutside, useIntervalFn } from '@vueuse/core'

defineProps<{ inverted?: boolean, ticketBase: string }>()
interface Item { id: string, title: string, ticket_id: string | null, read_at: string | null, created_at: string }
const open = ref(false)
const { data, refresh } = useFetch<{ items: Item[], unread: number }>('/api/notifications', { default: () => ({ items: [], unread: 0 }), server: false })
// Atualiza periodicamente enquanto a página está aberta.
useIntervalFn(() => refresh(), 60000)
const fmt = (d: string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
async function markAll() {
  await api('/api/notifications/read', { method: 'POST', body: {} })
  await refresh()
}
onClickOutside(useTemplateRef('box'), () => { open.value = false })
</script>

<template>
  <div ref="box" class="relative">
    <button
type="button" class="relative rounded-md p-2" :class="inverted ? 'text-white/85 hover:bg-white/10' : 'text-muted-foreground hover:bg-muted'"
      :aria-label="`Notificações (${data.unread} não lidas)`" :aria-expanded="open" @click="open = !open">
      <Icon name="lucide:bell" class="size-5" />
      <span v-if="data.unread" class="absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">{{ data.unread > 9 ? '9+' : data.unread }}</span>
    </button>
    <div
v-if="open" role="dialog" aria-label="Notificações"
      class="absolute z-50 w-80 max-w-[90vw] rounded-xl border bg-white text-foreground shadow-lg"
      :class="inverted ? 'bottom-full left-0 mb-2' : 'right-0 mt-2'">
      <div class="flex items-center justify-between border-b px-4 py-2.5">
        <p class="text-sm font-semibold">Notificações</p>
        <button v-if="data.unread" type="button" class="text-xs font-medium text-brand-blue hover:underline" @click="markAll">Marcar todas como lidas</button>
      </div>
      <p v-if="!data.items.length" class="px-4 py-6 text-center text-sm text-muted-foreground">Nada por aqui.</p>
      <ul v-else class="max-h-96 divide-y overflow-y-auto">
        <li v-for="n in data.items" :key="n.id">
          <NuxtLink :to="n.ticket_id ? `${ticketBase}/${n.ticket_id}` : ticketBase" class="block px-4 py-2.5 hover:bg-muted" @click="open = false">
            <p class="text-sm" :class="!n.read_at && 'font-semibold'">{{ n.title }}</p>
            <p class="text-xs text-muted-foreground">{{ fmt(n.created_at) }}</p>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
