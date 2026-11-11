<script setup lang="ts">
defineEmits<{ navigate: [] }>()
const route = useRoute()
const { access } = useAccess()

// Itens do proprietário só aparecem para ele (o servidor e a RLS também bloqueiam).
const items = computed(() => [
  { to: '/admin', label: 'Visão geral', icon: 'lucide:layout-dashboard', exact: true },
  { to: '/admin/chamados', label: 'Chamados', icon: 'lucide:wrench' },
  { to: '/admin/agenda', label: 'Agenda', icon: 'lucide:calendar-days' },
  { to: '/admin/clientes', label: 'Clientes', icon: 'lucide:building-2' },
  { to: '/admin/administradoras', label: 'Administradoras', icon: 'lucide:briefcase-business' },
  { to: '/admin/contratos', label: 'Contratos', icon: 'lucide:file-check-2' },
  ...(access.value?.staffRole === 'owner'
    ? [{ to: '/admin/usuarios', label: 'Usuários', icon: 'lucide:users' }, { to: '/admin/auditoria', label: 'Auditoria', icon: 'lucide:scroll-text' }]
    : []),
])
const isActive = (to: string, exact?: boolean) => exact ? route.path === to : route.path.startsWith(to)
</script>

<template>
  <nav aria-label="Painel" class="space-y-1">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
      :class="isActive(item.to, item.exact) ? 'bg-white text-brand-blue shadow-sm' : 'text-white/85 hover:bg-sidebar-accent hover:text-white'"
      :aria-current="isActive(item.to, item.exact) ? 'page' : undefined"
      @click="$emit('navigate')"
    >
      <Icon :name="item.icon" class="size-4.5" />
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>
