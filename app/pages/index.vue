<script setup lang="ts">
import { homePathFor } from '#shared/types/access'

definePageMeta({
  middleware: [async () => navigateTo(homePathFor(await useAccess().ensure()), { replace: true })],
})
</script>

<template>
  <div />
</template>
