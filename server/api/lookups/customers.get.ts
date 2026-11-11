// Clientes que o usuário pode selecionar (ex.: abrir chamado). A RLS limita o resultado.
export default defineEventHandler(async (event) => {
  await requireAccess(event)
  const db = await userDb(event)
  const { data, error } = await db.from('customers').select('id, trade_name, customer_kind').eq('active', true).order('trade_name').limit(1000)
  if (error) dbFail(error)
  return data ?? []
})
