import { OPEN_STATUSES } from '#shared/domain/labels'

// Resumo do portal (RLS): chamados por situação, próximas visitas e contratos ativos.
export default defineEventHandler(async (event) => {
  await requireAccess(event)
  const db = await userDb(event)
  const head = { count: 'exact' as const, head: true }
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const [open, progress, resolved, contracts, visits, recent] = await Promise.all([
    db.from('tickets').select('id', head).in('status', ['open', 'review']),
    db.from('tickets').select('id', head).in('status', OPEN_STATUSES.filter(s => !['open', 'review'].includes(s))),
    db.from('tickets').select('id', head).in('status', ['resolved', 'closed']).gte('updated_at', since),
    db.from('service_contracts').select('id', head).eq('status', 'active'),
    db.from('technical_visits').select('id, title, scheduled_for, customers(trade_name)').eq('status', 'scheduled')
      .gte('scheduled_for', new Date().toISOString()).order('scheduled_for').limit(5),
    db.from('tickets').select('id, number, title, status, priority, updated_at, customers(trade_name)').order('updated_at', { ascending: false }).limit(6),
  ])
  if (recent.error) dbFail(recent.error)
  return {
    open: open.count ?? 0, inProgress: progress.count ?? 0, resolved30d: resolved.count ?? 0,
    activeContracts: contracts.count ?? 0, nextVisits: visits.data ?? [], recent: recent.data ?? [],
  }
})
