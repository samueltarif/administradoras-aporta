import { uuidParam } from '#shared/schemas/registry'

export default defineEventHandler(async (event) => {
  await requireAccess(event)
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const db = await userDb(event)
  const [contract, financial, visits] = await Promise.all([
    db.from('service_contracts').select('*, customers(id, trade_name), management_companies(id, trade_name)').eq('id', id).single(),
    db.from('contract_financials').select('monthly_value, billing_notes').eq('contract_id', id).maybeSingle(),
    db.from('technical_visits').select('id, title, scheduled_for, status').eq('contract_id', id).order('scheduled_for', { ascending: false }).limit(20),
  ])
  if (contract.error) dbFail(contract.error)
  return { contract: contract.data, financial: financial.data ?? null, visits: visits.data ?? [] }
})
