<script setup lang="ts">
import TicketForm from '~/components/tickets/TicketForm.vue'

definePageMeta({ layout: 'portal', middleware: ['portal'] })
useHead({ title: 'Abrir chamado · Portal A Porta Móvel' })
</script>

<template>
  <div class="max-w-3xl">
    <AppPageHeader
title="Abrir chamado" description="Descreva o problema. A equipe A Porta Móvel recebe o aviso na hora."
      :crumbs="[{ label: 'Chamados', to: '/portal/chamados' }, { label: 'Novo' }]" />
    <Card><CardContent><TicketForm base-path="/portal/chamados" cancel-to="/portal/chamados" /></CardContent></Card>
  </div>
</template>
