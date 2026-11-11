<script setup lang="ts">
import ContractView from '~/components/contracts/ContractView.vue'

definePageMeta({ layout: 'portal', middleware: ['portal'] })
useHead({ title: 'Contrato · Portal A Porta Móvel' })
const route = useRoute()
</script>

<template>
  <div>
    <AppPageHeader title="Contrato" :crumbs="[{ label: 'Contratos', to: '/portal/contratos' }, { label: 'Detalhe' }]" />
    <ContractView :id="String(route.params.id)" />
  </div>
</template>
