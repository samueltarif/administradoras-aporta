<script setup lang="ts">
import { managementCompanySchema } from '#shared/schemas/registry'
import RegistryFields from '~/components/admin/RegistryFields.vue'

definePageMeta({ layout: 'admin', middleware: ['owner'] })
useHead({ title: 'Nova administradora · Painel A Porta Móvel' })

const { form, errors, saving, submit } = useRegistryForm(managementCompanySchema, toFormState(null, false))
async function save() {
  let id = ''
  const ok = await submit(async (payload) => {
    id = (await api<{ id: string }>('/api/admin/management-companies', { method: 'POST', body: payload })).id
  }, 'Administradora cadastrada.')
  if (ok) await navigateTo(`/admin/administradoras/${id}`)
}
</script>

<template>
  <div class="max-w-3xl">
    <AppPageHeader title="Nova administradora" :crumbs="[{ label: 'Administradoras', to: '/admin/administradoras' }, { label: 'Nova' }]" />
    <Card>
      <CardContent>
        <form novalidate class="space-y-6" @submit.prevent="save">
          <RegistryFields v-model="form" :errors="errors" />
          <div class="flex justify-end gap-2">
            <Button as-child variant="outline"><NuxtLink to="/admin/administradoras">Cancelar</NuxtLink></Button>
            <Button type="submit" :disabled="saving">{{ saving ? 'Salvando…' : 'Cadastrar' }}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
