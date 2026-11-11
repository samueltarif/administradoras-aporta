import { describe, expect, it } from 'vitest'
import { isValidCnpj, formatCnpj } from '#shared/utils/cnpj'
import { customerSchema } from '#shared/schemas/registry'
import { contractSchema, ticketCreateSchema } from '#shared/schemas/operations'
import { TRANSITIONS } from '#shared/domain/labels'

describe('CNPJ', () => {
  it('valida dígitos verificadores', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false)
    expect(isValidCnpj('00000000000000')).toBe(false)
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81')
  })
})

describe('schemas', () => {
  it('cliente: CNPJ opcional, inválido é rejeitado e campos vazios viram null', () => {
    const ok = customerSchema.parse({ trade_name: 'Cond. Teste', cnpj: '', email: '', customer_kind: 'condominium', active: true })
    expect(ok.cnpj).toBeNull()
    expect(ok.email).toBeNull()
    expect(customerSchema.safeParse({ trade_name: 'X', customer_kind: 'condominium' }).success).toBe(false)
    expect(customerSchema.safeParse({ trade_name: 'Cond', cnpj: '123', customer_kind: 'condominium' }).success).toBe(false)
  })
  it('chamado exige cliente, título e descrição', () => {
    expect(ticketCreateSchema.safeParse({ customer_id: 'x', title: 'a', description: 'b', category: 'repair' }).success).toBe(false)
  })
  it('contrato por administradora exige a administradora; fim não pode ser antes do início', () => {
    const base = { customer_id: '6f1c0b1e-5b7a-4c1e-9a7e-2f2b1c3d4e5f', title: 'Manutenção', status: 'draft' }
    expect(contractSchema.safeParse({ ...base, contractor_type: 'management' }).success).toBe(false)
    expect(contractSchema.safeParse({ ...base, contractor_type: 'customer', starts_on: '2026-02-01', ends_on: '2026-01-01' }).success).toBe(false)
    expect(contractSchema.safeParse({ ...base, contractor_type: 'customer', monthly_value: '850.5' }).success).toBe(true)
  })
  it('estados finais não têm transições', () => {
    expect(TRANSITIONS.closed).toEqual([])
    expect(TRANSITIONS.cancelled).toEqual([])
    expect(TRANSITIONS.open).not.toContain('resolved')
  })
})
