<script setup lang="ts">
const mobileOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { mobileOpen.value = false })
</script>

<template>
  <div class="min-h-dvh lg:pl-64">
    <aside class="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 bg-sidebar p-4 lg:flex">
      <div class="px-2 pt-2">
        <AppLogo inverted />
      </div>
      <AdminNav class="flex-1" />
      <AdminUserBox />
    </aside>

    <div v-if="mobileOpen" class="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="absolute inset-0 bg-slate-900/50" @click="mobileOpen = false" />
      <aside class="relative flex h-full w-72 max-w-[85%] flex-col gap-6 bg-sidebar p-4">
        <div class="flex items-center justify-between px-2 pt-2">
          <AppLogo inverted />
          <button type="button" class="rounded-md p-2 text-white hover:bg-white/10" aria-label="Fechar menu" @click="mobileOpen = false">
            <Icon name="lucide:x" class="size-5" />
          </button>
        </div>
        <AdminNav class="flex-1" @navigate="mobileOpen = false" />
        <AdminUserBox />
      </aside>
    </div>

    <header class="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur lg:hidden">
      <button type="button" class="rounded-md p-2 hover:bg-muted" aria-label="Abrir menu" @click="mobileOpen = true">
        <Icon name="lucide:menu" class="size-5" />
      </button>
      <AppLogo />
    </header>

    <main class="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <slot />
    </main>
  </div>
</template>
