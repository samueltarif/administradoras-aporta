<script setup lang="ts">
defineProps<{ id: string, label: string, error?: string, hint?: string, required?: boolean }>()
</script>

<template>
  <div class="space-y-2">
    <Label :for="id">
      {{ label }}<span v-if="required" class="text-destructive" aria-hidden="true">*</span>
    </Label>
    <slot />
    <p v-if="error" :id="`${id}-error`" class="text-sm text-destructive">
      {{ error }}
    </p>
    <p v-else-if="hint" class="text-xs text-muted-foreground">
      {{ hint }}
    </p>
  </div>
</template>
