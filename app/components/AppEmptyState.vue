<script setup lang="ts">
defineProps<{ title: string, description?: string, icon?: string }>()
</script>

<template>
  <div class="flex flex-col items-center gap-2 px-6 py-12 text-center">
    <span class="grid size-12 place-items-center rounded-full bg-accent text-brand-blue">
      <Icon :name="icon ?? 'lucide:inbox'" class="size-6" />
    </span>
    <p class="font-medium">
      {{ title }}
    </p>
    <p v-if="description" class="max-w-sm text-sm text-muted-foreground">
      {{ description }}
    </p>
    <slot />
  </div>
</template>
