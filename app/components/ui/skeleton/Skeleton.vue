<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="skeleton" :class="cn('animate-pulse rounded-md bg-slate-200/70', props.class)" />
</template>
