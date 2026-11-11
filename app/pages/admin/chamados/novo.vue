<script setup lang="ts">
import TicketForm from '~/components/tickets/TicketForm.vue'

definePageMeta({ layout: 'admin', middleware: ['staff'] })
useHead({ title: 'Abrir chamado · Painel A Porta Móvel' })
</script>

<template>
  <div class="max-w-3xl">
    <AppPageHeader title="Abrir chamado" :crumbs="[{ label: 'Chamados', to: '/admin/chamados' }, { label: 'Novo' }]" />
    <Card><CardContent><TicketForm base-path="/admin/chamados" cancel-to="/admin/chamados" /></CardContent></Card>
  </div>
</template>
