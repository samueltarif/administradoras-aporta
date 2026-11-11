import type { ContractStatus, Frequency, TicketCategory, TicketPriority, TicketStatus, VisitStatus } from '../../app/types/database.types'

export const TICKET_STATUSES: TicketStatus[] = ['open', 'review', 'scheduled', 'in_progress', 'waiting_customer', 'waiting_material', 'resolved', 'closed', 'cancelled']
export const OPEN_STATUSES: TicketStatus[] = ['open', 'review', 'scheduled', 'in_progress', 'waiting_customer', 'waiting_material']
export const TICKET_PRIORITIES: TicketPriority[] = ['low', 'normal', 'high', 'emergency']
export const TICKET_CATEGORIES: TicketCategory[] = ['gate_stuck', 'automation', 'preventive', 'repair', 'metalwork', 'repaint', 'other']
export const CONTRACT_STATUSES: ContractStatus[] = ['draft', 'active', 'suspended', 'expired', 'closed']
export const FREQUENCIES: Frequency[] = ['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual']
export const VISIT_STATUSES: VisitStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled']

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Aberto', review: 'Em análise', scheduled: 'Agendado', in_progress: 'Em atendimento',
  waiting_customer: 'Aguardando cliente', waiting_material: 'Aguardando material',
  resolved: 'Resolvido', closed: 'Encerrado', cancelled: 'Cancelado',
}
export const PRIORITY_LABEL: Record<TicketPriority, string> = { low: 'Baixa', normal: 'Normal', high: 'Alta', emergency: 'Emergência' }
export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  gate_stuck: 'Portão travado', automation: 'Automatizador', preventive: 'Manutenção preventiva',
  repair: 'Reparo', metalwork: 'Serralheria', repaint: 'Repintura', other: 'Outros',
}
export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: 'Rascunho', active: 'Ativo', suspended: 'Suspenso', expired: 'Vencido', closed: 'Encerrado',
}
export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal', bimonthly: 'Bimestral',
  quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual',
}
export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  scheduled: 'Agendada', in_progress: 'Em andamento', completed: 'Concluída', cancelled: 'Cancelada',
}
export const ROLE_LABEL = {
  owner: 'Proprietário', operations: 'Operações', manager: 'Gestor(a)', attendant: 'Atendente',
  syndic: 'Síndico(a)', porter: 'Porteiro(a) / solicitante', representative: 'Responsável',
} as const

/** Espelho das transições do banco (private.ticket_transition_ok) — o banco é quem decide. */
export const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['review', 'scheduled', 'in_progress', 'waiting_customer', 'cancelled'],
  review: ['scheduled', 'in_progress', 'waiting_customer', 'waiting_material', 'cancelled'],
  scheduled: ['in_progress', 'waiting_customer', 'waiting_material', 'cancelled'],
  in_progress: ['scheduled', 'waiting_customer', 'waiting_material', 'resolved', 'cancelled'],
  waiting_customer: ['in_progress', 'scheduled', 'resolved', 'cancelled'],
  waiting_material: ['in_progress', 'scheduled', 'cancelled'],
  resolved: ['closed', 'review', 'in_progress'],
  closed: [],
  cancelled: [],
}

export type BadgeTone = 'default' | 'outline' | 'secondary' | 'success' | 'warning' | 'info' | 'muted' | 'destructive'
export const STATUS_TONE: Record<TicketStatus, BadgeTone> = {
  open: 'info', review: 'info', scheduled: 'secondary', in_progress: 'warning', waiting_customer: 'warning',
  waiting_material: 'warning', resolved: 'success', closed: 'muted', cancelled: 'muted',
}
export const PRIORITY_TONE: Record<TicketPriority, BadgeTone> = { low: 'muted', normal: 'outline', high: 'warning', emergency: 'destructive' }
