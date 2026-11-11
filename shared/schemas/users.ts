import { z } from 'zod'

export const membershipSchema = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('staff'), role: z.enum(['owner', 'operations']) }),
  z.object({ scope: z.literal('management'), role: z.enum(['manager', 'attendant']), target_id: z.uuid('Selecione a administradora') }),
  z.object({ scope: z.literal('customer'), role: z.enum(['syndic', 'porter', 'representative']), target_id: z.uuid('Selecione o cliente') }),
])
export const inviteSchema = z.object({
  email: z.email('E-mail inválido').trim().toLowerCase().max(254),
  full_name: z.string().trim().min(3, 'Informe o nome').max(120),
  membership: membershipSchema,
})
export const membershipChangeSchema = z.object({
  user_id: z.uuid(),
  membership: membershipSchema,
  active: z.boolean(),
})
export const profileStatusSchema = z.object({ active: z.boolean() })
export type MembershipInput = z.infer<typeof membershipSchema>
