<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { TicketStatus } from '~/types/database.types'

const props = defineProps<{ ticketId: string, status: TicketStatus }>()
const emit = defineEmits<{ changed: [] }>()
const comment = ref('')
const busy = ref(false)
const canCancel = computed(() => ['open', 'review'].includes(props.status))
const isResolved = computed(() => props.status === 'resolved')

async function run(action: 'cancel' | 'confirm' | 'reopen') {
  if (action === 'reopen' && comment.value.trim().length < 5) return toast.error('Explique o motivo da reabertura.')
  if (action === 'cancel' && !confirm('Cancelar este chamado?')) return
  busy.value = true
  try {
    await api(`/api/tickets/${props.ticketId}/action`, { method: 'POST', body: { action, comment: comment.value || undefined } })
    comment.value = ''
    toast.success(action === 'confirm' ? 'Obrigado! Chamado encerrado.' : action === 'reopen' ? 'Chamado reaberto.' : 'Chamado cancelado.')
    emit('changed')
  }
  catch (e) { toast.error(apiErrorMessage(e)) }
  finally { busy.value = false }
}
</script>

<template>
  <div v-if="canCancel || isResolved" class="space-y-3">
    <template v-if="isResolved">
      <p class="text-sm">A equipe marcou este chamado como <strong>resolvido</strong>. Confirme ou reabra informando o motivo.</p>
      <Textarea v-model="comment" rows="2" placeholder="Comentário (obrigatório para reabrir)" maxlength="2000" />
      <div class="flex flex-wrap gap-2">
        <Button size="sm" :disabled="busy" @click="run('confirm')"><Icon name="lucide:check" /> Confirmar resolução</Button>
        <Button size="sm" variant="outline" :disabled="busy" @click="run('reopen')"><Icon name="lucide:rotate-ccw" /> Reabrir</Button>
      </div>
    </template>
    <Button v-else size="sm" variant="outline" :disabled="busy" @click="run('cancel')"><Icon name="lucide:x" /> Cancelar chamado</Button>
  </div>
  <p v-else class="text-sm text-muted-foreground">Nenhuma ação disponível nesta situação.</p>
</template>
