<script setup lang="ts">
const { access } = useAccess()
const signOut = useSignOut()
const route = useRoute()
// Menu conforme o perfil: porteiro não vê contratos nem agenda (a RLS também bloqueia).
const onlyPorter = computed(() => !access.value?.staffRole && !access.value?.managements.length
  && (access.value?.customers ?? []).every(c => c.role === 'porter'))
const attendantOnly = computed(() => !access.value?.staffRole && !access.value?.customers.some(c => c.role !== 'porter')
  && (access.value?.managements ?? []).every(m => m.role === 'attendant'))
const nav = computed(() => [
  { to: '/portal', label: 'Início', icon: 'lucide:house', exact: true },
  { to: '/portal/chamados', label: 'Chamados', icon: 'lucide:wrench' },
  ...(onlyPorter.value || attendantOnly.value ? [] : [{ to: '/portal/contratos', label: 'Contratos', icon: 'lucide:file-check-2' }]),
  ...(onlyPorter.value ? [] : [{ to: '/portal/agenda', label: 'Agenda', icon: 'lucide:calendar-days' }]),
  { to: '/portal/condominios', label: 'Clientes', icon: 'lucide:building-2' },
])
const active = (to: string, exact?: boolean) => (exact ? route.path === to : route.path.startsWith(to))
</script>

<template>
  <div class="min-h-dvh pb-20 md:pb-0">
    <header class="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <NuxtLink to="/portal" aria-label="Início"><AppLogo /></NuxtLink>
        <nav class="hidden flex-1 items-center gap-1 md:flex" aria-label="Portal">
          <NuxtLink
v-for="i in nav" :key="i.to" :to="i.to" class="rounded-md px-3 py-2 text-sm font-medium"
            :class="active(i.to, i.exact) ? 'bg-accent text-brand-blue' : 'text-muted-foreground hover:text-foreground'">{{ i.label }}</NuxtLink>
        </nav>
        <div class="ml-auto flex items-center gap-1">
          <AppNotifications ticket-base="/portal/chamados" />
          <NuxtLink to="/portal/perfil" class="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label="Meu perfil"><Icon name="lucide:circle-user" class="size-5" /></NuxtLink>
          <button type="button" class="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label="Sair" @click="signOut"><Icon name="lucide:log-out" class="size-5" /></button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-6xl p-4 sm:p-6"><slot /></main>
    <nav class="fixed inset-x-0 bottom-0 z-30 grid border-t bg-white md:hidden" :style="{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }" aria-label="Portal (móvel)">
      <NuxtLink
v-for="i in nav" :key="i.to" :to="i.to" class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
        :class="active(i.to, i.exact) ? 'text-brand-red' : 'text-muted-foreground'">
        <Icon :name="i.icon" class="size-5" />{{ i.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
