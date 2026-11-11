export default defineEventHandler(async (event) => {
  await requireAccess(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const db = await userDb(event)
  const [list, unread] = await Promise.all([
    db.from('notifications').select('id, kind, title, ticket_id, read_at, created_at').order('created_at', { ascending: false }).limit(30),
    db.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
  ])
  if (list.error) dbFail(list.error)
  return { items: list.data ?? [], unread: unread.count ?? 0 }
})
