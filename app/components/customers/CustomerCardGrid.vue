<script setup lang="ts">
import type { CustomerListItem } from './types'
import CustomerCard from './CustomerCard.vue'

defineProps<{ items: CustomerListItem[], loading?: boolean, skeleton?: boolean }>()
</script>

<template>
  <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" :aria-busy="loading || skeleton">
    <template v-if="skeleton">
      <div v-for="i in 8" :key="i" class="overflow-hidden rounded-xl border bg-card">
        <Skeleton class="aspect-[3/2] rounded-none" />
        <div class="space-y-3 p-4"><Skeleton class="h-4 w-24" /><Skeleton class="h-5 w-4/5" /><Skeleton class="h-4 w-3/5" /><Skeleton class="h-8 w-full" /></div>
      </div>
    </template>
    <TransitionGroup v-else name="card" tag="div" class="contents">
      <CustomerCard v-for="c in items" :key="c.id" :item="c" :class="loading && 'opacity-60'" />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.card-enter-active { transition: opacity 0.2s ease; }
.card-enter-from { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .card-enter-active { transition: none; } }
</style>
