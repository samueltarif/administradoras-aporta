import type { H3Event } from 'h3'
import { OPEN_STATUSES } from '#shared/domain/labels'

const CONTRACT_PRIORITY = ['active', 'suspended', 'draft', 'expired', 'closed'] as const
export type ContractSituation = (typeof CONTRACT_PRIORITY)[number] | 'none'
export interface CustomerSummary { openTickets: number, contract: ContractSituation }

/**
 * Indicadores agregados dos clientes de UMA página (sem N+1): 2 consultas com `in (ids)`,
 * sempre com a sessão do usuário (RLS). Contrato: a situação "mais relevante" entre os do cliente.
 */
export async function summarizeCustomers(event: H3Event, ids: string[]): Promise<Record<string, CustomerSummary>> {
  const out: Record<string, CustomerSummary> = Object.fromEntries(ids.map(id => [id, { openTickets: 0, contract: 'none' as ContractSituation }]))
  if (!ids.length) return out
  const db = await userDb(event)
  const [tickets, contracts] = await Promise.all([
    db.from('tickets').select('customer_id').in('customer_id', ids).in('status', OPEN_STATUSES),
    db.from('service_contracts').select('customer_id, status').in('customer_id', ids),
  ])
  if (tickets.error) dbFail(tickets.error)
  if (contracts.error) dbFail(contracts.error)
  for (const t of tickets.data ?? []) out[t.customer_id]!.openTickets++
  for (const c of contracts.data ?? []) {
    const cur = out[c.customer_id]!
    const rank = (s: ContractSituation) => (s === 'none' ? 99 : CONTRACT_PRIORITY.indexOf(s))
    if (rank(c.status) < rank(cur.contract)) cur.contract = c.status
  }
  return out
}
