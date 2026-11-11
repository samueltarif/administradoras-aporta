-- 07: regras de chamados (categorias, transicoes, imutabilidade, acoes do cliente)
-- e nomes de participantes visiveis apenas a quem pode ver o chamado.
alter table public.tickets add constraint tickets_category_check check (category in
  ('gate_stuck','automation','preventive','repair','metalwork','repaint','other'));

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
    ('resolved','closed'),('resolved','review'),('resolved','in_progress')
  );
$$;

create or replace function private.tickets_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.customer_id is distinct from old.customer_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Campos de origem do chamado nao podem ser alterados' using errcode = '42501';
  end if;
  if not private.ticket_transition_ok(old.status, new.status) then
    raise exception 'Transicao de status invalida: % -> %', old.status, new.status using errcode = '22023';
  end if;
  if new.status is distinct from old.status then
    new.closed_at := case when new.status in ('closed','cancelled') then now() else null end;
  end if;
  return new;
end $$;
create trigger tickets_guard before update on public.tickets
  for each row execute function private.tickets_guard();

-- Acoes do lado do cliente: cancelar (open/review), confirmar resolucao, reabrir.
create or replace function public.customer_ticket_action(p_ticket uuid, p_action text, p_comment text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare t public.tickets; target text;
begin
  select * into t from public.tickets where id = p_ticket for update;
  if not found or not private.can_read_ticket(t.customer_id, t.created_by) then
    raise exception 'Chamado nao encontrado' using errcode = 'P0002';
  end if;
  target := case
    when p_action = 'cancel' and t.status in ('open','review') then 'cancelled'
    when p_action = 'confirm' and t.status = 'resolved' then 'closed'
    when p_action = 'reopen' and t.status = 'resolved' then 'review'
  end;
  if target is null then
    raise exception 'Acao nao permitida para o status atual' using errcode = '22023';
  end if;
  if p_action = 'reopen' and length(trim(coalesce(p_comment, ''))) < 5 then
    raise exception 'Informe o motivo da reabertura' using errcode = '22023';
  end if;
  update public.tickets set status = target where id = p_ticket;
  if length(trim(coalesce(p_comment, ''))) > 0 then
    insert into public.ticket_messages (ticket_id, author_id, body)
    values (p_ticket, (select auth.uid()), trim(p_comment));
  end if;
  return target;
end $$;

-- Nomes de quem participa do chamado (sem e-mail), so para quem pode ve-lo.
create or replace function public.ticket_people(p_ticket uuid)
returns table (user_id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  with t as (
    select * from public.tickets
    where id = p_ticket and private.can_read_ticket(customer_id, created_by)
  ), ids as (
    select created_by as uid from t union select assigned_to from t
    union select m.author_id from public.ticket_messages m join t on m.ticket_id = t.id
    union select h.actor_id from public.ticket_status_history h join t on h.ticket_id = t.id
  )
  select p.user_id, p.display_name from public.user_profiles p join ids on ids.uid = p.user_id;
$$;

-- updated_at em contratos e visitas.
alter table public.service_contracts add column if not exists updated_at timestamptz not null default now();
alter table public.technical_visits add column if not exists updated_at timestamptz not null default now();
create trigger contracts_set_updated_at before update on public.service_contracts
  for each row execute function public.pm_set_updated_at();
create trigger visits_set_updated_at before update on public.technical_visits
  for each row execute function public.pm_set_updated_at();
create index if not exists tickets_created_by_idx on public.tickets(created_by);
create index if not exists ticket_messages_ticket_idx on public.ticket_messages(ticket_id, created_at);
create index if not exists visits_customer_idx on public.technical_visits(customer_id, scheduled_for);

revoke all on function private.ticket_transition_ok(text, text) from public, anon;
revoke all on function private.tickets_guard() from public, anon, authenticated;
grant execute on function private.ticket_transition_ok(text, text) to authenticated;
revoke all on function public.customer_ticket_action(uuid, text, text) from public, anon;
revoke all on function public.ticket_people(uuid) from public, anon;
grant execute on function public.customer_ticket_action(uuid, text, text) to authenticated;
grant execute on function public.ticket_people(uuid) to authenticated;
