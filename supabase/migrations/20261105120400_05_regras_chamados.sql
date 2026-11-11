-- 05: regras de chamados no banco: transições válidas, campos imutáveis, closed_at e histórico.
create or replace function private.ticket_transition_ok(p_old text, p_new text)
returns boolean language sql immutable set search_path = '' as $$
  select p_old = p_new or (p_old, p_new) in (
    ('open','review'),('open','scheduled'),('open','in_progress'),('open','waiting_customer'),('open','cancelled'),
    ('review','scheduled'),('review','in_progress'),('review','waiting_customer'),
    ('review','waiting_material'),('review','cancelled'),
    ('scheduled','in_progress'),('scheduled','waiting_customer'),('scheduled','waiting_material'),('scheduled','cancelled'),
    ('in_progress','scheduled'),('in_progress','waiting_customer'),('in_progress','waiting_material'),
    ('in_progress','resolved'),('in_progress','cancelled'),
    ('waiting_customer','in_progress'),('waiting_customer','scheduled'),('waiting_customer','resolved'),
    ('waiting_customer','cancelled'),
    ('waiting_material','in_progress'),('waiting_material','scheduled'),('waiting_material','cancelled'),
    ('resolved','closed'),('resolved','review'),('resolved','in_progress'));
$$;

create or replace function private.tickets_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.customer_id is distinct from old.customer_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Campos de origem do chamado não podem ser alterados' using errcode = '42501';
  end if;
  if not private.ticket_transition_ok(old.status, new.status) then
    raise exception 'Transição de status inválida: % -> %', old.status, new.status using errcode = '22023';
  end if;
  if new.status is distinct from old.status then
    new.closed_at := case when new.status in ('closed','cancelled') then now() else null end;
  end if;
  return new;
end $$;
create trigger tickets_guard before update on public.tickets
  for each row execute function private.tickets_guard();

-- Histórico de status com autor (auth.uid() do JWT; nulo em operações administrativas).
create or replace function private.record_ticket_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
  select p.user_id into actor from public.user_profiles p where p.user_id = (select auth.uid());
  if tg_op = 'INSERT' then
    insert into public.ticket_status_history (ticket_id, old_status, new_status, actor_id)
    values (new.id, null, new.status, actor);
  elsif old.status is distinct from new.status then
    insert into public.ticket_status_history (ticket_id, old_status, new_status, actor_id)
    values (new.id, old.status, new.status, actor);
  end if;
  return new;
end $$;
create trigger tickets_record_status after insert or update of status on public.tickets
  for each row execute function private.record_ticket_status();

revoke all on function private.ticket_transition_ok(text, text) from public, anon;
grant execute on function private.ticket_transition_ok(text, text) to authenticated, service_role;
revoke all on function private.tickets_guard() from public, anon, authenticated;
revoke all on function private.record_ticket_status() from public, anon, authenticated;
