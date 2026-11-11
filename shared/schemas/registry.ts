import { z } from 'zod'
import { isValidCnpj, onlyDigits } from '../utils/cnpj'

const optionalText = (max: number) => z.string().trim().max(max).transform(v => v || null).nullable().optional()

const cnpj = z.string().trim().transform(v => onlyDigits(v) || null)
  .refine(v => v === null || isValidCnpj(v), 'CNPJ inválido')
  .nullable().optional()

const email = z.string().trim().toLowerCase().max(254)
  .refine(v => v === '' || z.email().safeParse(v).success, 'E-mail inválido')
  .transform(v => v || null).nullable().optional()

/** Campos editáveis comuns. Códigos legados são somente leitura (vêm da importação). */
const registryBase = z.object({
  trade_name: z.string().trim().min(2, 'Informe o nome fantasia').max(160),
  legal_name: optionalText(200),
  cnpj,
  email,
  phone: optionalText(40),
  address_text: optionalText(300),
  active: z.boolean().default(true),
})

export const CUSTOMER_KINDS = ['condominium', 'business', 'person', 'unclassified'] as const
export const CUSTOMER_KIND_LABEL: Record<(typeof CUSTOMER_KINDS)[number], string> = {
  condominium: 'Condomínio',
  business: 'Empresa',
  person: 'Pessoa física',
  unclassified: 'A classificar',
}

export const managementCompanySchema = registryBase
export const customerSchema = registryBase.extend({ customer_kind: z.enum(CUSTOMER_KINDS) })

export type ManagementCompanyInput = z.infer<typeof managementCompanySchema>
export type CustomerInput = z.infer<typeof customerSchema>

/** Parâmetros de listagem (query string), com limites seguros. */
export const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(''),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
  active: z.enum(['all', 'true', 'false']).default('all'),
})

export const customerListQuerySchema = listQuerySchema.extend({
  kind: z.enum([...CUSTOMER_KINDS, 'all']).default('all'),
  management: z.union([z.uuid(), z.literal('none'), z.literal('')]).optional().default(''),
  include: z.enum(['summary', '']).optional().default(''),
})

export const uuidParam = z.object({ id: z.uuid('Identificador inválido') })
