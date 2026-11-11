<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { TicketDetail } from './types'

const props = defineProps<{ ticketId: string, items: TicketDetail['attachments'], isStaff: boolean, canUpload: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const uploading = ref(false)
const internal = ref(false)
const size = (n: number | null) => (n ? `${(n / 1024 / 1024).toFixed(n > 1048576 ? 1 : 2)} MB` : '')

async function upload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    if (internal.value) fd.append('visibility', 'internal')
    await api(`/api/tickets/${props.ticketId}/attachments`, { method: 'POST', body: fd })
    toast.success('Anexo enviado.')
    emit('changed')
  }
  catch (err) { toast.error(apiErrorMessage(err)) }
  finally { uploading.value = false; input.value = '' }
}
</script>

<template>
  <div class="space-y-3">
    <ul v-if="items.length" class="divide-y rounded-lg border">
      <li v-for="a in items" :key="a.id" class="flex items-center gap-3 px-3 py-2 text-sm">
        <Icon :name="a.mime_type === 'application/pdf' ? 'lucide:file-text' : 'lucide:image'" class="size-4 text-brand-blue" />
        <a :href="`/api/attachments/${a.id}`" target="_blank" rel="noopener" class="min-w-0 flex-1 truncate font-medium text-brand-blue hover:underline">{{ a.file_name }}</a>
        <Badge v-if="a.visibility === 'internal'" variant="warning">Interno</Badge>
        <span class="text-xs text-muted-foreground">{{ size(a.size_bytes) }}</span>
      </li>
    </ul>
    <p v-else class="text-sm text-muted-foreground">Nenhum anexo.</p>
    <div v-if="canUpload" class="flex flex-wrap items-center gap-3">
      <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-accent" :class="uploading && 'pointer-events-none opacity-60'">
        <Icon :name="uploading ? 'lucide:loader-circle' : 'lucide:paperclip'" :class="uploading && 'animate-spin'" class="size-4" />
        {{ uploading ? 'Enviando…' : 'Anexar arquivo' }}
        <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" @change="upload">
      </label>
      <label v-if="isStaff" class="flex items-center gap-2 text-xs text-muted-foreground">
        <input v-model="internal" type="checkbox" class="size-4"> Anexo interno (só equipe)
      </label>
    </div>
  </div>
</template>
