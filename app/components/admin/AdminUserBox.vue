<script setup lang="ts">
const { access } = useAccess()
const signOut = useSignOut()
const roleLabel = computed(() => access.value?.staffRole === 'owner' ? 'Proprietário' : 'Operações')
</script>

<template>
  <div class="flex items-center gap-3 rounded-lg bg-sidebar-accent/60 p-3">
    <span class="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-semibold text-white">
      {{ (access?.displayName ?? access?.email ?? '?').slice(0, 1).toUpperCase() }}
    </span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-white">
        {{ access?.displayName ?? access?.email }}
      </p>
      <p class="text-xs text-white/70">
        {{ roleLabel }}
      </p>
    </div>
    <AppNotifications inverted ticket-base="/admin/chamados" />
    <button type="button" class="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Sair" @click="signOut">
      <Icon name="lucide:log-out" class="size-4" />
    </button>
  </div>
</template>
