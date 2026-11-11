<script setup lang="ts">
import VisitAgenda from '~/components/visits/VisitAgenda.vue'
import VisitForm from '~/components/visits/VisitForm.vue'

definePageMeta({ layout: 'admin', middleware: ['staff'] })
useHead({ title: 'Agenda · Painel A Porta Móvel' })
const agenda = useTemplateRef<{ refresh: () => Promise<void> }>('agenda')
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader title="Agenda de visitas" description="Visitas técnicas e manutenções preventivas." />
    <Card><CardContent><VisitForm @saved="agenda?.refresh()" /></CardContent></Card>
    <VisitAgenda ref="agenda" staff ticket-base="/admin/chamados" />
  </div>
</template>
