<script setup lang="ts">
import TicketListView from '~/components/tickets/TicketListView.vue'

definePageMeta({ layout: 'portal', middleware: ['portal'] })
useHead({ title: 'Chamados · Portal A Porta Móvel' })
</script>

<template>
  <div>
    <AppPageHeader title="Chamados" description="Acompanhe os chamados que você pode ver.">
      <template #actions>
        <Button as-child><NuxtLink to="/portal/chamados/novo"><Icon name="lucide:plus" /> Abrir chamado</NuxtLink></Button>
      </template>
    </AppPageHeader>
    <TicketListView base-path="/portal/chamados" new-path="/portal/chamados/novo" />
  </div>
</template>
