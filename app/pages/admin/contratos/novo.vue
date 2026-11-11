<script setup lang="ts">
import ContractForm from '~/components/contracts/ContractForm.vue'

definePageMeta({ layout: 'admin', middleware: ['owner'] })
useHead({ title: 'Novo contrato · Painel A Porta Móvel' })
</script>

<template>
  <div class="max-w-3xl">
    <AppPageHeader title="Novo contrato" :crumbs="[{ label: 'Contratos', to: '/admin/contratos' }, { label: 'Novo' }]" />
    <Card><CardContent><ContractForm @saved="(id: string) => navigateTo(`/admin/contratos/${id}`)" /></CardContent></Card>
  </div>
</template>
