<script setup lang="ts">
import type { TicketPriority, TicketStatus } from '~/types/database.types'
import { PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE } from '#shared/domain/labels'

defineProps<{ status?: TicketStatus, priority?: TicketPriority }>()
</script>

<template>
  <Badge v-if="status" :variant="STATUS_TONE[status]">{{ STATUS_LABEL[status] }}</Badge>
  <Badge v-else-if="priority" :variant="PRIORITY_TONE[priority]">
    <Icon v-if="priority === 'emergency'" name="lucide:siren" />{{ PRIORITY_LABEL[priority] }}
  </Badge>
</template>
