<script setup lang="ts">
import { toast } from 'vue-sonner'
import { fieldErrors } from '#shared/schemas/auth'
import { ticketCreateSchema } from '#shared/schemas/operations'
import { CATEGORY_LABEL, PRIORITY_LABEL, TICKET_CATEGORIES, TICKET_PRIORITIES } from '#shared/domain/labels'

const props = defineProps<{ basePath: string, cancelTo: string }>()
const { data: customers, status } = useFetch<{ id: string, trade_name: string }[]>('/api/lookups/customers', { default: () => [] })
const form = reactive({ customer_id: '', title: '', description: '', category: 'gate_stuck', priority: 'normal', location_detail: '' })
watch(customers, (list) => { if (list.length === 1 && !form.customer_id) form.customer_id = list[0]!.id }, { immediate: true })
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const files = ref<File[]>([])

async function submit() {
  const parsed = ticketCreateSchema.safeParse(form)
  if (!parsed.success) { errors.value = fieldErrors(parsed.error); return }
  errors.value = {}
  saving.value = true
  try {
    const created = await api<{ id: string, number: number }>('/api/tickets', { method: 'POST', body: parsed.data })
    for (const file of files.value) {
      const fd = new FormData(); fd.append('file', file)
      await api(`/api/tickets/${created.id}/attachments`, { method: 'POST', body: fd }).catch(() => toast.warning(`Não foi possível anexar ${file.name}`))
    }
    toast.success(`Chamado #${created.number} aberto.`)
    await navigateTo(`${props.basePath}/${created.id}`)
  }
  catch (e) { toast.error(apiErrorMessage(e)) }
  finally { saving.value = false }
}
</script>

<template>
  <form novalidate class="grid gap-5 sm:grid-cols-2" @submit.prevent="submit">
    <AppField id="customer_id" label="Condomínio / cliente" :error="errors.customer_id" required class="sm:col-span-2">
      <NativeSelect id="customer_id" v-model="form.customer_id" :disabled="status === 'pending'">
        <option value="" disabled>Selecione…</option>
        <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.trade_name }}</option>
      </NativeSelect>
    </AppField>
    <AppField id="category" label="Categoria" required>
      <NativeSelect id="category" v-model="form.category">
        <option v-for="c in TICKET_CATEGORIES" :key="c" :value="c">{{ CATEGORY_LABEL[c] }}</option>
      </NativeSelect>
    </AppField>
    <AppField id="priority" label="Prioridade" required hint="Emergência: risco à segurança ou portão travado com pessoas.">
      <NativeSelect id="priority" v-model="form.priority">
        <option v-for="p in TICKET_PRIORITIES" :key="p" :value="p">{{ PRIORITY_LABEL[p] }}</option>
      </NativeSelect>
    </AppField>
    <AppField id="title" label="Título" :error="errors.title" required class="sm:col-span-2">
      <Input id="title" v-model="form.title" maxlength="120" placeholder="Ex.: Portão da garagem não fecha" />
    </AppField>
    <AppField id="location_detail" label="Local" :error="errors.location_detail" class="sm:col-span-2">
      <Input id="location_detail" v-model="form.location_detail" maxlength="160" placeholder="Ex.: Garagem do bloco B" />
    </AppField>
    <AppField id="description" label="Descrição" :error="errors.description" required class="sm:col-span-2">
      <Textarea id="description" v-model="form.description" rows="5" maxlength="4000" />
    </AppField>
    <AppField id="files" label="Fotos ou documentos" hint="JPG, PNG, WEBP ou PDF, até 10 MB cada." class="sm:col-span-2">
      <input id="files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" class="block w-full text-sm" @change="files = Array.from(($event.target as HTMLInputElement).files ?? [])">
    </AppField>
    <div class="flex justify-end gap-2 sm:col-span-2">
      <Button as-child variant="outline"><NuxtLink :to="cancelTo">Cancelar</NuxtLink></Button>
      <Button type="submit" :disabled="saving">{{ saving ? 'Enviando…' : 'Abrir chamado' }}</Button>
    </div>
  </form>
</template>
