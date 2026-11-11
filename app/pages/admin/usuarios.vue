<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ROLE_LABEL } from '#shared/domain/labels'
import type { MembershipInput } from '#shared/schemas/users'
import InviteForm from '~/components/admin/InviteForm.vue'

definePageMeta({ layout: 'admin', middleware: ['owner'] })
useHead({ title: 'Usuários · Painel A Porta Móvel' })
type Role = keyof typeof ROLE_LABEL
interface Member { scope: 'staff' | 'management' | 'customer', role: Role, active: boolean, target_id: string | null, target_name: string }
interface UserRow { user_id: string, display_name: string | null, email: string | null, active: boolean, last_sign_in_at: string | null, invited_pending: boolean, memberships: Member[] }
const { access } = useAccess()
const { data, status, refresh } = useFetch<UserRow[]>('/api/admin/users', { default: () => [] })
const q = ref('')
const rows = computed(() => data.value.filter(u => !q.value || `${u.display_name} ${u.email}`.toLowerCase().includes(q.value.toLowerCase())))

async function toggleMember(u: UserRow, m: Member) {
  const membership = { scope: m.scope, role: m.role, ...(m.target_id ? { target_id: m.target_id } : {}) } as MembershipInput
  if (m.active && !confirm(`Revogar o acesso de ${u.display_name} a ${m.target_name}? O efeito é imediato.`)) return
  try { await api('/api/admin/users/membership', { method: 'POST', body: { user_id: u.user_id, membership, active: !m.active } }); await refresh() }
  catch (e) { toast.error(apiErrorMessage(e)) }
}
async function toggleUser(u: UserRow) {
  if (u.active && !confirm(`Desativar ${u.display_name}? Todos os acessos ficam bloqueados.`)) return
  try { await api(`/api/admin/users/${u.user_id}`, { method: 'PATCH', body: { active: !u.active } }); await refresh() }
  catch (e) { toast.error(apiErrorMessage(e)) }
}
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : 'nunca')
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader title="Usuários e acessos" description="Convites, vínculos e revogação. Toda mudança é auditada." />
    <Card><CardHeader><CardTitle>Convidar usuário</CardTitle></CardHeader><CardContent><InviteForm @invited="refresh()" /></CardContent></Card>
    <Card class="gap-0 py-0">
      <div class="border-b p-3"><Input v-model="q" placeholder="Filtrar por nome ou e-mail" aria-label="Filtrar usuários" /></div>
      <div v-if="status === 'pending'" class="space-y-2 p-3"><Skeleton v-for="i in 5" :key="i" class="h-14" /></div>
      <ul v-else class="divide-y">
        <li v-for="u in rows" :key="u.user_id" class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-start">
          <div class="min-w-0 md:w-72">
            <p class="font-medium">{{ u.display_name }} <Badge v-if="!u.active" variant="muted">Desativado</Badge> <Badge v-if="u.invited_pending" variant="warning">Convite pendente</Badge></p>
            <p class="truncate text-xs text-muted-foreground">{{ u.email }} · último acesso {{ fmt(u.last_sign_in_at) }}</p>
          </div>
          <div class="flex flex-1 flex-wrap gap-2">
            <button
v-for="(m, i) in u.memberships" :key="i" type="button" class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
              :class="m.active ? 'bg-white' : 'bg-muted text-muted-foreground line-through'" :title="m.active ? 'Clique para revogar' : 'Clique para reativar'" @click="toggleMember(u, m)">
              {{ m.target_name }} · {{ ROLE_LABEL[m.role] }}
            </button>
            <span v-if="!u.memberships.length" class="text-xs text-muted-foreground">Sem vínculos</span>
          </div>
          <Button v-if="u.user_id !== access?.userId" size="sm" variant="outline" @click="toggleUser(u)">{{ u.active ? 'Desativar' : 'Reativar' }}</Button>
        </li>
      </ul>
    </Card>
  </div>
</template>
