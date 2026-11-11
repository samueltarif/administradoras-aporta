<script setup lang="ts">
import ContractList from '~/components/contracts/ContractList.vue'

definePageMeta({ layout: 'admin', middleware: ['staff'] })
useHead({ title: 'Contratos · Painel A Porta Móvel' })
const { access } = useAccess()
</script>

<template>
  <div>
    <AppPageHeader title="Contratos" description="Contratos de manutenção por cliente atendido.">
      <template #actions>
        <Button v-if="access?.staffRole === 'owner'" as-child><NuxtLink to="/admin/contratos/novo"><Icon name="lucide:plus" /> Novo contrato</NuxtLink></Button>
      </template>
    </AppPageHeader>
    <ContractList base-path="/admin/contratos" :show-value="access?.staffRole === 'owner'" />
  </div>
</template>
