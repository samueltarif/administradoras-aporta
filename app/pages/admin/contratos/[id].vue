<script setup lang="ts">
import ContractForm from '~/components/contracts/ContractForm.vue'
import ContractView from '~/components/contracts/ContractView.vue'

definePageMeta({ layout: 'admin', middleware: ['staff'] })
useHead({ title: 'Contrato · Painel A Porta Móvel' })
const route = useRoute()
const id = String(route.params.id)
const { access } = useAccess()
const editing = ref(false)
const { data, refresh } = await useFetch<{ contract: Record<string, string | null> & { title: string }, financial: { monthly_value: number | null } | null }>(`/api/contracts/${id}`)
const viewKey = ref(0)
async function saved() { editing.value = false; await refresh(); viewKey.value++ }
</script>

<template>
  <div>
    <AppPageHeader :title="data?.contract.title ?? 'Contrato'" :crumbs="[{ label: 'Contratos', to: '/admin/contratos' }, { label: 'Detalhe' }]">
      <template #actions>
        <Button v-if="access?.staffRole === 'owner'" variant="outline" @click="editing = !editing">{{ editing ? 'Cancelar edição' : 'Editar' }}</Button>
      </template>
    </AppPageHeader>
    <Card v-if="editing && data" class="mb-6">
      <CardContent><ContractForm :id="id" :initial="{ ...data.contract, monthly_value: data.financial?.monthly_value }" @saved="saved" /></CardContent>
    </Card>
    <ContractView :id="id" :key="viewKey" />
  </div>
</template>
