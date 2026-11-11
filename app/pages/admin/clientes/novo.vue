<script setup lang="ts">
import { customerSchema } from '#shared/schemas/registry'
import RegistryFields from '~/components/admin/RegistryFields.vue'

definePageMeta({ layout: 'admin', middleware: ['owner'] })
useHead({ title: 'Novo cliente · Painel A Porta Móvel' })

const { form, errors, saving, submit } = useRegistryForm(customerSchema, toFormState(null, true))
async function save() {
  let id = ''
  const ok = await submit(async (payload) => {
    id = (await api<{ id: string }>('/api/admin/customers', { method: 'POST', body: payload })).id
  }, 'Cliente cadastrado.')
  if (ok) await navigateTo(`/admin/clientes/${id}`)
}
</script>

<template>
  <div class="max-w-3xl">
    <AppPageHeader title="Novo cliente" :crumbs="[{ label: 'Clientes', to: '/admin/clientes' }, { label: 'Novo' }]" />
    <Card>
      <CardContent>
        <form novalidate class="space-y-6" @submit.prevent="save">
          <RegistryFields v-model="form" :errors="errors" with-kind />
          <div class="flex justify-end gap-2">
            <Button as-child variant="outline"><NuxtLink to="/admin/clientes">Cancelar</NuxtLink></Button>
            <Button type="submit" :disabled="saving">{{ saving ? 'Salvando…' : 'Cadastrar' }}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
