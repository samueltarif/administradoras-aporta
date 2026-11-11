<script setup lang="ts">
import VisitAgenda from '~/components/visits/VisitAgenda.vue'

definePageMeta({ layout: 'portal', middleware: ['portal'] })
useHead({ title: 'Agenda · Portal A Porta Móvel' })
</script>

<template>
  <div>
    <AppPageHeader title="Agenda" description="Visitas técnicas e preventivas previstas para os seus locais." />
    <VisitAgenda ticket-base="/portal/chamados" />
  </div>
</template>
