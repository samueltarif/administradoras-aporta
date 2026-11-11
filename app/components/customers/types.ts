import type { CustomerKind } from '~/types/database.types'

export type ContractSituation = 'active' | 'suspended' | 'draft' | 'expired' | 'closed' | 'none'
export interface CustomerListItem {
  id: string, trade_name: string, legal_name: string | null, cnpj: string | null, address_text: string | null
  customer_kind: CustomerKind, legacy_code: string | null, active: boolean
  management: { id: string, trade_name: string } | null
  summary: { openTickets: number, contract: ContractSituation } | null
}
