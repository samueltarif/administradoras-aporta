import { z } from 'zod'
import { CONTRACT_STATUSES, FREQUENCIES, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, VISIT_STATUSES } from '../domain/labels'

const text = (min: number, max: number, msg: string) => z.string().trim().min(min, msg).max(max)
const optional = (max: number) => z.string().trim().max(max).transform(v => v || null).nullable().optional()
const optionalUuid = z.union([z.uuid(), z.literal('')]).transform(v => v || null).nullable().optional()
const optionalDate = z.union([z.iso.date(), z.literal('')]).transform(v => v || null).nullable().optional()

export const ticketCreateSchema = z.object({
  customer_id: z.uuid('Selecione o condomínio/cliente'),
  title: text(3, 120, 'Descreva o problema em poucas palavras'),
  description: text(5, 4000, 'Detalhe o problema (mínimo 5 caracteres)'),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES).default('normal'),
  location_detail: optional(160),
})
export const ticketStaffUpdateSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assigned_to: optionalUuid,
})
export const messageSchema = z.object({ body: text(1, 5000, 'Escreva a mensagem') })
export const customerActionSchema = z.object({
  action: z.enum(['cancel', 'confirm', 'reopen']),
  comment: z.string().trim().max(2000).optional(),
})
export const ticketListQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(''),
  status: z.enum([...TICKET_STATUSES, 'all', 'active']).default('active'),
  priority: z.enum([...TICKET_PRIORITIES, 'all']).default('all'),
  customer: z.union([z.uuid(), z.literal('')]).optional().default(''),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
})

export const contractSchema = z.object({
  customer_id: z.uuid('Selecione o cliente'),
  contractor_type: z.enum(['customer', 'management']),
  contractor_management_id: optionalUuid,
  contract_number: optional(40),
  title: text(3, 160, 'Informe o objeto do contrato'),
  description: optional(2000),
  starts_on: optionalDate,
  ends_on: optionalDate,
  maintenance_frequency: z.union([z.enum(FREQUENCIES), z.literal('')]).transform(v => v || null).nullable().optional(),
  status: z.enum(CONTRACT_STATUSES),
  monthly_value: z.union([z.coerce.number().min(0).max(10_000_000), z.literal('')]).transform(v => (v === '' ? null : v)).nullable().optional(),
}).refine(v => v.contractor_type === 'customer' || !!v.contractor_management_id, {
  path: ['contractor_management_id'], message: 'Selecione a administradora contratante',
}).refine(v => !v.starts_on || !v.ends_on || v.ends_on >= v.starts_on, {
  path: ['ends_on'], message: 'Término antes do início',
})

export const visitSchema = z.object({
  customer_id: z.uuid('Selecione o cliente'),
  title: text(3, 160, 'Informe o objetivo da visita'),
  scheduled_for: z.iso.datetime({ offset: true, local: true, message: 'Data e hora inválidas' }),
  contract_id: optionalUuid,
  ticket_id: optionalUuid,
  assigned_to: optionalUuid,
})
export const visitUpdateSchema = z.object({
  status: z.enum(VISIT_STATUSES),
  result_summary: optional(2000),
})
export type TicketCreateInput = z.infer<typeof ticketCreateSchema>
export type ContractInput = z.infer<typeof contractSchema>
