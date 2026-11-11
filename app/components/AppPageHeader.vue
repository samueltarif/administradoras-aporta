<script setup lang="ts">
defineProps<{ title: string, description?: string, crumbs?: { label: string, to?: string }[] }>()
</script>

<template>
  <div class="mb-6 space-y-3">
    <nav v-if="crumbs?.length" aria-label="Trilha" class="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <template v-for="(c, i) in crumbs" :key="i">
        <NuxtLink v-if="c.to" :to="c.to" class="hover:text-foreground hover:underline">{{ c.label }}</NuxtLink>
        <span v-else class="text-foreground" aria-current="page">{{ c.label }}</span>
        <Icon v-if="i < crumbs.length - 1" name="lucide:chevron-right" class="size-3.5" />
      </template>
    </nav>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-brand-blue">
          {{ title }}
        </h1>
        <p v-if="description" class="mt-1 text-sm text-muted-foreground">
          {{ description }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
