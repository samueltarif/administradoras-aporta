-- 10: índices para chaves estrangeiras (advisor de desempenho) e consultas de perfil.
create index if not exists audit_events_actor_idx on public.audit_events(actor_id);
create index if not exists notifications_ticket_idx on public.notifications(ticket_id);
create index if not exists contracts_contractor_management_idx on public.service_contracts(contractor_management_id);
create index if not exists visits_assigned_idx on public.technical_visits(assigned_to);
create index if not exists visits_contract_idx on public.technical_visits(contract_id);
create index if not exists visits_ticket_idx on public.technical_visits(ticket_id);
create index if not exists ticket_attachments_uploaded_by_idx on public.ticket_attachments(uploaded_by);
create index if not exists ticket_notes_author_idx on public.ticket_internal_notes(author_id);
create index if not exists ticket_messages_author_idx on public.ticket_messages(author_id);
create index if not exists ticket_history_actor_idx on public.ticket_status_history(actor_id);
create index if not exists tickets_assigned_idx on public.tickets(assigned_to);
