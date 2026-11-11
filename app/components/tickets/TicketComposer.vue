<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{ ticketId: string, mode: 'message' | 'note' }>()
const emit = defineEmits<{ sent: [] }>()
const body = ref('')
const sending = ref(false)

async function send() {
  if (!body.value.trim()) return
  sending.value = true
  try {
    await api(`/api/tickets/${props.ticketId}/${props.mode === 'note' ? 'notes' : 'messages'}`, { method: 'POST', body: { body: body.value } })
    body.value = ''
    emit('sent')
  }
  catch (e) { toast.error(apiErrorMessage(e)) }
  finally { sending.value = false }
}
</script>

<template>
  <form class="space-y-2" @submit.prevent="send">
    <Label :for="`composer-${mode}`" class="sr-only">{{ mode === 'note' ? 'Nota interna' : 'Mensagem' }}</Label>
    <Textarea
:id="`composer-${mode}`" v-model="body" rows="3" maxlength="5000"
      :placeholder="mode === 'note' ? 'Nota interna (visível só para a equipe A Porta Móvel)' : 'Escreva uma mensagem…'"
      :class="mode === 'note' && 'border-amber-300 bg-amber-50/40'" />
    <div class="flex justify-end">
      <Button type="submit" size="sm" :variant="mode === 'note' ? 'secondary' : 'default'" :disabled="sending || !body.trim()">
        <Icon :name="mode === 'note' ? 'lucide:lock' : 'lucide:send'" />{{ mode === 'note' ? 'Salvar nota' : 'Enviar' }}
      </Button>
    </div>
  </form>
</template>
