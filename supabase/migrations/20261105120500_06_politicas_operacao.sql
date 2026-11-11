-- 06: RLS da operação. Porteiro só vê os próprios chamados; atendente não vê contratos;
-- notas internas e valores financeiros nunca chegam ao portal externo.
create or replace function private.can_read_ticket(p_customer uuid, p_creator uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_staff() or exists (
    select 1 from public.management_assignments ma
    join public.management_memberships mm on mm.management_company_id = ma.management_company_id
    join public.user_profiles p on p.user_id = mm.user_id
    where ma.customer_id = p_customer and ma.ended_at is null
      and mm.user_id = (select auth.uid()) and mm.active and p.active
  ) or exists (
    select 1 from public.customer_memberships cm
    join public.user_profiles p on p.user_id = cm.user_id
    where cm.customer_id = p_customer and cm.user_id = (select auth.uid()) and cm.active and p.active
      and (cm.member_role <> 'porter' or p_creator = (select auth.uid())));
$$;
create or replace function private.can_read_contract(p_customer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_staff() or exists (
    select 1 from public.management_assignments ma
    join public.management_memberships mm on mm.management_company_id = ma.management_company_id
    join public.user_profiles p on p.user_id = mm.user_id
    where ma.customer_id = p_customer and ma.ended_at is null and mm.member_role = 'manager'
      and mm.user_id = (select auth.uid()) and mm.active and p.active
  ) or exists (
    select 1 from public.customer_memberships cm
    join public.user_profiles p on p.user_id = cm.user_id
    where cm.customer_id = p_customer and cm.user_id = (select auth.uid()) and cm.active and p.active
      and cm.member_role in ('syndic','representative'));
$$;
create or replace function private.can_read_visit(p_customer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_staff() or exists (
    select 1 from public.management_assignments ma
    join public.management_memberships mm on mm.management_company_id = ma.management_company_id
    join public.user_profiles p on p.user_id = mm.user_id
    where ma.customer_id = p_customer and ma.ended_at is null
      and mm.user_id = (select auth.uid()) and mm.active and p.active
  ) or exists (
    select 1 from public.customer_memberships cm
    join public.user_profiles p on p.user_id = cm.user_id
    where cm.customer_id = p_customer and cm.user_id = (select auth.uid()) and cm.active and p.active
      and cm.member_role in ('syndic','representative'));
$$;
do $$
declare f text;
begin
  foreach f in array array['private.can_read_ticket(uuid,uuid)','private.can_read_contract(uuid)',
    'private.can_read_visit(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

create policy contracts_read on public.service_contracts for select to authenticated
  using (private.can_read_contract(customer_id));
create policy contracts_owner_insert on public.service_contracts for insert to authenticated
  with check (private.is_owner());
create policy contracts_owner_update on public.service_contracts for update to authenticated
  using (private.is_owner()) with check (private.is_owner());
create policy financials_owner_read on public.contract_financials for select to authenticated
  using (private.is_owner());
create policy financials_owner_insert on public.contract_financials for insert to authenticated
  with check (private.is_owner());
create policy financials_owner_update on public.contract_financials for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy tickets_read on public.tickets for select to authenticated
  using (private.can_read_ticket(customer_id, created_by));
create policy tickets_create on public.tickets for insert to authenticated
  with check (created_by = (select auth.uid()) and private.can_read_customer(customer_id)
    and status = 'open' and assigned_to is null and closed_at is null);
create policy tickets_staff_update on public.tickets for update to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy ticket_history_read on public.ticket_status_history for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id));
create policy messages_read on public.ticket_messages for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id));
create policy messages_add on public.ticket_messages for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (select 1 from public.tickets t where t.id = ticket_id));
create policy notes_staff_read on public.ticket_internal_notes for select to authenticated
  using (private.is_staff());
create policy notes_staff_insert on public.ticket_internal_notes for insert to authenticated
  with check (private.is_staff() and author_id = (select auth.uid()));
create policy visits_read on public.technical_visits for select to authenticated
  using (private.can_read_visit(customer_id));
create policy visits_staff_insert on public.technical_visits for insert to authenticated
  with check (private.is_staff());
create policy visits_staff_update on public.technical_visits for update to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy attachments_read on public.ticket_attachments for select to authenticated
  using ((visibility = 'public' or private.is_staff()) and exists (select 1 from public.tickets t where t.id = ticket_id));
create policy attachments_add on public.ticket_attachments for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and (visibility = 'public' or private.is_staff())
    and exists (select 1 from public.tickets t where t.id = ticket_id));
create policy audit_owner_read on public.audit_events for select to authenticated
  using (private.is_owner());

-- RPCs do portal (expostas de propósito; validam acesso internamente).
create or replace function public.customer_ticket_action(p_ticket uuid, p_action text, p_comment text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare t public.tickets; target text;
begin
  select * into t from public.tickets where id = p_ticket for update;
  if not found or not private.can_read_ticket(t.customer_id, t.created_by) then
    raise exception 'Chamado não encontrado' using errcode = 'P0002';
  end if;
  target := case
    when p_action = 'cancel' and t.status in ('open','review') then 'cancelled'
    when p_action = 'confirm' and t.status = 'resolved' then 'closed'
    when p_action = 'reopen' and t.status = 'resolved' then 'review' end;
  if target is null then raise exception 'Ação não permitida para o status atual' using errcode = '22023'; end if;
  if p_action = 'reopen' and length(trim(coalesce(p_comment, ''))) < 5 then
    raise exception 'Informe o motivo da reabertura' using errcode = '22023';
  end if;
  update public.tickets set status = target where id = p_ticket;
  if length(trim(coalesce(p_comment, ''))) > 0 then
    insert into public.ticket_messages (ticket_id, author_id, body) values (p_ticket, (select auth.uid()), trim(p_comment));
  end if;
  return target;
end $$;

create or replace function public.ticket_people(p_ticket uuid)
returns table (user_id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  with t as (
    select * from public.tickets where id = p_ticket and private.can_read_ticket(customer_id, created_by)
  ), ids as (
    select created_by as uid from t union select assigned_to from t
    union select m.author_id from public.ticket_messages m join t on m.ticket_id = t.id
    union select h.actor_id from public.ticket_status_history h join t on h.ticket_id = t.id
  )
  select p.user_id, p.display_name from public.user_profiles p join ids on ids.uid = p.user_id;
$$;
revoke all on function public.customer_ticket_action(uuid, text, text) from public, anon;
revoke all on function public.ticket_people(uuid) from public, anon;
grant execute on function public.customer_ticket_action(uuid, text, text) to authenticated;
grant execute on function public.ticket_people(uuid) to authenticated;
