<script setup lang="ts">
import TicketDetailView from '~/components/tickets/TicketDetailView.vue'

definePageMeta({ layout: 'portal', middleware: ['portal'] })
const route = useRoute()
</script>

<template>
  <TicketDetailView :id="String(route.params.id)" list-path="/portal/chamados" list-label="Chamados" />
</template>
