<script setup lang="ts">
import TicketDetailView from '~/components/tickets/TicketDetailView.vue'

definePageMeta({ layout: 'admin', middleware: ['staff'] })
const route = useRoute()
</script>

<template>
  <TicketDetailView :id="String(route.params.id)" list-path="/admin/chamados" list-label="Chamados" />
</template>
