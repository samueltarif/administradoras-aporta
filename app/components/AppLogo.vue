<script setup lang="ts">
// Marca textual de fallback. Com o logo oficial em public/, passe image="/logo.svg".
withDefaults(defineProps<{ inverted?: boolean, image?: string }>(), { inverted: false, image: '' })
</script>

<template>
  <div class="flex items-center gap-2.5 select-none">
    <img v-if="image" :src="image" alt="A Porta Móvel" class="h-9 w-auto">
    <template v-else>
      <span class="grid size-9 place-items-center rounded-lg bg-brand-red text-white shadow-sm">
        <Icon name="lucide:door-open" class="size-5" />
      </span>
      <span class="leading-tight">
        <span class="block text-[11px] font-medium uppercase tracking-wider" :class="inverted ? 'text-white/70' : 'text-muted-foreground'">A</span>
        <span class="block text-lg font-bold tracking-tight" :class="inverted ? 'text-white' : 'text-brand-blue'">Porta Móvel</span>
      </span>
    </template>
  </div>
</template>
