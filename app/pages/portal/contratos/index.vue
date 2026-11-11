<script setup lang="ts">
import ContractList from '~/components/contracts/ContractList.vue'

definePageMeta({ layout: 'portal', middleware: ['portal'] })
useHead({ title: 'Contratos · Portal A Porta Móvel' })
</script>

<template>
  <div>
    <AppPageHeader title="Contratos" description="Contratos de manutenção dos locais que você acompanha." />
    <ContractList base-path="/portal/contratos" />
  </div>
</template>
