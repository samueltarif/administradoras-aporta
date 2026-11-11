-- Regras adicionais: porteiro so consulta chamados criados por ele.
create or replace function public.can_read_ticket(p_customer uuid, p_creator uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff() or exists (
    select 1 from public.management_assignments ma
    join public.management_memberships mm
      on mm.management_company_id = ma.management_company_id
    join public.user_profiles p on p.user_id = mm.user_id
    where ma.customer_id = p_customer and ma.ended_at is null
      and mm.user_id = (select auth.uid()) and mm.active and p.active
  ) or exists (
    select 1 from public.customer_memberships cm
    join public.user_profiles p on p.user_id = cm.user_id
    where cm.customer_id = p_customer and cm.user_id = (select auth.uid())
      and cm.active and p.active
      and (cm.member_role <> 'porter' or p_creator = (select auth.uid()))
  );
$$;
create or replace function public.can_read_contract(p_customer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff() or exists (
    select 1 from public.management_assignments ma
    join public.management_memberships mm on mm.management_company_id = ma.management_company_id
    join public.user_profiles p on p.user_id = mm.user_id
    where ma.customer_id = p_customer and ma.ended_at is null
      and mm.user_id = (select auth.uid()) and mm.active and p.active
  ) or exists (
    select 1 from public.customer_memberships cm
    join public.user_profiles p on p.user_id = cm.user_id
    where cm.customer_id = p_customer and cm.user_id = (select auth.uid())
      and cm.active and p.active and cm.member_role in ('syndic','representative')
  );
$$;
revoke all on function public.can_read_ticket(uuid,uuid) from public, anon;
revoke all on function public.can_read_contract(uuid) from public, anon;
grant execute on function public.can_read_ticket(uuid,uuid) to authenticated;
grant execute on function public.can_read_contract(uuid) to authenticated;

alter table public.service_contracts enable row level security;
alter table public.contract_financials enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_status_history enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_internal_notes enable row level security;
alter table public.technical_visits enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.audit_events enable row level security;

create policy contracts_read on public.service_contracts for select to authenticated
  using (public.can_read_contract(customer_id));
create policy contracts_owner_insert on public.service_contracts for insert to authenticated
  with check (public.is_owner());
create policy contracts_owner_update on public.service_contracts for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy financials_owner_read on public.contract_financials for select to authenticated
  using (public.is_owner());
create policy financials_owner_write on public.contract_financials for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy tickets_read on public.tickets for select to authenticated
  using (public.can_read_ticket(customer_id, created_by));
create policy tickets_create on public.tickets for insert to authenticated
  with check (created_by = (select auth.uid()) and public.can_read_customer(customer_id)
    and status = 'open' and assigned_to is null and closed_at is null);
create policy tickets_staff_update on public.tickets for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy ticket_history_read on public.ticket_status_history for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id));
create policy messages_read on public.ticket_messages for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id));
create policy messages_add on public.ticket_messages for insert to authenticated
  with check (author_id = (select auth.uid())
    and exists (select 1 from public.tickets t where t.id = ticket_id));
create policy notes_staff_read on public.ticket_internal_notes for select to authenticated
  using (public.is_staff());
create policy notes_staff_insert on public.ticket_internal_notes for insert to authenticated
  with check (public.is_staff() and author_id = (select auth.uid()));
create policy visits_read on public.technical_visits for select to authenticated
  using (public.can_read_contract(customer_id));
create policy visits_staff_insert on public.technical_visits for insert to authenticated
  with check (public.is_staff());
create policy visits_staff_update on public.technical_visits for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy attachments_read on public.ticket_attachments for select to authenticated
  using ((visibility = 'public' or public.is_staff())
    and exists (select 1 from public.tickets t where t.id = ticket_id));
create policy attachments_add on public.ticket_attachments for insert to authenticated
  with check (uploaded_by = (select auth.uid())
    and (visibility = 'public' or public.is_staff())
    and exists (select 1 from public.tickets t where t.id = ticket_id));
create policy audit_owner_read on public.audit_events for select to authenticated
  using (public.is_owner());

-- IMPORTANTE: politicas de storage.objects e URLs assinadas nao estao configuradas aqui.
-- Claude Code deve implementar o upload/download privado na camada de servidor e
-- as policies do bucket, e validar a autorizacao por ticket antes de habilitar anexos.
