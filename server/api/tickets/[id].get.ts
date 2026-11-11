import { uuidParam } from '#shared/schemas/registry'

export default defineEventHandler(async (event) => {
  const access = await requireAccess(event)
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const db = await userDb(event)
  const ticket = await db.from('tickets')
    .select('*, customers(id, trade_name)').eq('id', id).single()
  if (ticket.error) dbFail(ticket.error)
  const [history, messages, attachments, people, visits, notes] = await Promise.all([
    db.from('ticket_status_history').select('id, old_status, new_status, actor_id, changed_at').eq('ticket_id', id).order('changed_at'),
    db.from('ticket_messages').select('id, author_id, body, created_at').eq('ticket_id', id).order('created_at'),
    db.from('ticket_attachments').select('id, file_name, mime_type, size_bytes, visibility, uploaded_by, created_at').eq('ticket_id', id).order('created_at'),
    db.rpc('ticket_people', { p_ticket: id }),
    db.from('technical_visits').select('id, title, scheduled_for, status').eq('ticket_id', id).order('scheduled_for'),
    access.staffRole
      ? db.from('ticket_internal_notes').select('id, author_id, body, created_at').eq('ticket_id', id).order('created_at')
      : Promise.resolve({ data: [], error: null }),
  ])
  for (const r of [history, messages, attachments, people, visits, notes]) if (r.error) dbFail(r.error)
  const names = Object.fromEntries((people.data ?? []).map(p => [p.user_id, p.display_name]))
  return {
    ticket: ticket.data,
    history: history.data ?? [],
    messages: messages.data ?? [],
    attachments: attachments.data ?? [],
    visits: visits.data ?? [],
    notes: notes.data ?? [],
    names,
    isStaff: Boolean(access.staffRole),
    isOwnTicket: ticket.data.created_by === access.userId,
  }
})
