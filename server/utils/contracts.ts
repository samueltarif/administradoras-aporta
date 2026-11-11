import type { H3Event } from 'h3'
import type { ContractInput } from '#shared/schemas/operations'

/** Grava contrato e, separadamente, o valor (tabela financeira restrita ao proprietário). */
export async function saveContract(event: H3Event, input: ContractInput, id?: string) {
  const { monthly_value, ...contract } = input
  if (contract.contractor_type === 'customer') contract.contractor_management_id = null
  const db = await userDb(event)
  const res = id
    ? await db.from('service_contracts').update(contract).eq('id', id).select('id').single()
    : await db.from('service_contracts').insert(contract).select('id').single()
  if (res.error) dbFail(res.error)
  const fin = await db.from('contract_financials').upsert({ contract_id: res.data.id, monthly_value: monthly_value ?? null })
  if (fin.error) dbFail(fin.error, 'Contrato salvo, mas o valor não foi gravado')
  return res.data
}
