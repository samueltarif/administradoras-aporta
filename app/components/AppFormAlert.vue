<script setup lang="ts">
defineProps<{ tone?: 'error' | 'success' | 'info' }>()
</script>

<template>
  <div
    role="alert"
    class="flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm"
    :class="{
      'border-red-200 bg-red-50 text-red-800': tone === 'error' || !tone,
      'border-emerald-200 bg-emerald-50 text-emerald-800': tone === 'success',
      'border-blue-200 bg-blue-50 text-brand-blue': tone === 'info',
    }"
  >
    <Icon
      :name="tone === 'success' ? 'lucide:circle-check' : tone === 'info' ? 'lucide:info' : 'lucide:circle-alert'"
      class="mt-0.5 size-4 shrink-0"
    />
    <span><slot /></span>
  </div>
</template>
