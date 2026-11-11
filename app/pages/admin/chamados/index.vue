<script setup lang="ts">
import TicketListView from '~/components/tickets/TicketListView.vue'

definePageMeta({ layout: 'admin', middleware: ['staff'] })
useHead({ title: 'Chamados · Painel A Porta Móvel' })
</script>

<template>
  <div>
    <AppPageHeader title="Chamados" description="Todos os chamados dos clientes atendidos.">
      <template #actions>
        <Button as-child><NuxtLink to="/admin/chamados/novo"><Icon name="lucide:plus" /> Abrir chamado</NuxtLink></Button>
      </template>
    </AppPageHeader>
    <TicketListView base-path="/admin/chamados" new-path="/admin/chamados/novo" />
  </div>
</template>
