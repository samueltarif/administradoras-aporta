-- PORTAL A PORTA MÓVEL: instalação consolidada (projeto exclusivo do portal).
-- Gerado a partir de supabase/migrations em 05/11/2026. Execute UMA vez em projeto VAZIO.
-- Não use junto com 'supabase db push' para as mesmas migrations.

-- >>> 20261105120000_01_cadastros.sql
-- 01: cadastros (administradoras, clientes, vínculos) e schema privado de apoio.
-- Instalação limpa no projeto exclusivo do portal (rluzszruexjxkgrylvjd).
create extension if not exists pgcrypto;

-- Funções auxiliares ficam fora da Data API (expõe apenas public e graphql_public).
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create table if not exists public.management_companies (
  id uuid primary key default gen_random_uuid(),
  legacy_source text, legacy_code text,
  trade_name text not null check (length(trim(trade_name)) >= 2),
  legal_name text, cnpj text, email text, phone text, address_text text,
  legacy_status text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint management_legacy_pair check ((legacy_source is null) = (legacy_code is null)),
  constraint management_legacy_unique unique (legacy_source, legacy_code)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  legacy_source text, legacy_code text,
  trade_name text not null check (length(trim(trade_name)) >= 2),
  legal_name text,
  customer_kind text not null default 'unclassified'
    check (customer_kind in ('condominium','business','person','unclassified')),
  cnpj text, email text, phone text, address_text text,
  legacy_status text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_legacy_pair check ((legacy_source is null) = (legacy_code is null)),
  constraint customer_legacy_unique unique (legacy_source, legacy_code)
);

create table if not exists public.management_assignments (
  id uuid primary key default gen_random_uuid(),
  management_company_id uuid not null references public.management_companies(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  effective_from date, -- Data histórica desconhecida no legado: NÃO inventar.
  recorded_at timestamptz not null default now(),
  ended_at timestamptz,
  source_system text not null default 'portal',
  constraint ended_after_recorded check (ended_at is null or ended_at >= recorded_at)
);

alter table public.management_companies enable row level security;
alter table public.customers enable row level security;
alter table public.management_assignments enable row level security;

-- Uma administradora ativa por cliente; histórico preservado.
create unique index if not exists management_one_active_per_customer
  on public.management_assignments(customer_id) where ended_at is null;
create index if not exists management_assignments_company_idx
  on public.management_assignments(management_company_id) where ended_at is null;
create index if not exists customers_trade_name_idx on public.customers (trade_name);
create index if not exists customers_kind_idx on public.customers (customer_kind);
create index if not exists management_trade_name_idx on public.management_companies (trade_name);

create trigger customers_set_updated_at before update on public.customers
  for each row execute function private.set_updated_at();
create trigger management_set_updated_at before update on public.management_companies
  for each row execute function private.set_updated_at();

-- >>> 20261105120100_02_identidade_acessos.sql
-- 02: identidades e vínculos de acesso. Usuários do Auth são separados dos cadastros importados.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.staff_memberships (
  user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  staff_role text not null check (staff_role in ('owner','operations')),
  active boolean not null default true
);
create table if not exists public.management_memberships (
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  management_company_id uuid not null references public.management_companies(id) on delete cascade,
  member_role text not null check (member_role in ('manager','attendant')),
  active boolean not null default true,
  primary key (user_id, management_company_id)
);
create table if not exists public.customer_memberships (
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  member_role text not null check (member_role in ('syndic','porter','representative')),
  active boolean not null default true,
  primary key (user_id, customer_id)
);
alter table public.user_profiles enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.management_memberships enable row level security;
alter table public.customer_memberships enable row level security;
create index if not exists management_memberships_company_idx
  on public.management_memberships(management_company_id, active);
create index if not exists customer_memberships_customer_idx
  on public.customer_memberships(customer_id, active);

-- Perfil criado para todo usuário do Auth; sem vínculos ele não acessa nada.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_profiles (user_id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), new.email))
  on conflict (user_id) do nothing;
  return new;
end $$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_portal_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Helpers de RLS: SECURITY DEFINER evita recursão; nunca confiam em dados do cliente.
create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_memberships s
    join public.user_profiles p on p.user_id = s.user_id
    where s.user_id = (select auth.uid()) and s.active and p.active);
$$;
create or replace function private.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_memberships s
    join public.user_profiles p on p.user_id = s.user_id
    where s.user_id = (select auth.uid()) and s.active and p.active and s.staff_role = 'owner');
$$;
create or replace function private.can_read_management(p_management uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_staff() or exists (
    select 1 from public.management_memberships mm
    join public.user_profiles p on p.user_id = mm.user_id
    where mm.user_id = (select auth.uid()) and mm.active and p.active
      and mm.management_company_id = p_management
  ) or exists (
    select 1 from public.management_assignments ma
    join public.customer_memberships cm on cm.customer_id = ma.customer_id
    join public.user_profiles p on p.user_id = cm.user_id
    where ma.management_company_id = p_management and ma.ended_at is null
      and cm.user_id = (select auth.uid()) and cm.active and p.active);
$$;
create or replace function private.can_read_customer(p_customer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_staff() or exists (
    select 1 from public.customer_memberships cm
    join public.user_profiles p on p.user_id = cm.user_id
    where cm.user_id = (select auth.uid()) and cm.active and p.active and cm.customer_id = p_customer
  ) or exists (
    select 1 from public.management_assignments ma
    join public.management_memberships mm on mm.management_company_id = ma.management_company_id
    join public.user_profiles p on p.user_id = mm.user_id
    where ma.customer_id = p_customer and ma.ended_at is null
      and mm.user_id = (select auth.uid()) and mm.active and p.active);
$$;

do $$
declare f text;
begin
  foreach f in array array['private.is_staff()','private.is_owner()',
    'private.can_read_management(uuid)','private.can_read_customer(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- >>> 20261105120200_03_politicas_cadastros.sql
-- 03: RLS dos cadastros e vínculos. Negação por padrão; escrita só do proprietário.
create policy management_read on public.management_companies for select to authenticated
  using (private.can_read_management(id));
create policy management_owner_insert on public.management_companies for insert to authenticated
  with check (private.is_owner());
create policy management_owner_update on public.management_companies for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy customers_read on public.customers for select to authenticated
  using (private.can_read_customer(id));
create policy customers_owner_insert on public.customers for insert to authenticated
  with check (private.is_owner());
create policy customers_owner_update on public.customers for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy assignments_read on public.management_assignments for select to authenticated
  using (private.can_read_customer(customer_id) or private.can_read_management(management_company_id));
create policy assignments_owner_insert on public.management_assignments for insert to authenticated
  with check (private.is_owner());
create policy assignments_owner_update on public.management_assignments for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy user_profiles_read on public.user_profiles for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());
create policy user_profiles_owner_update on public.user_profiles for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy staff_read on public.staff_memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_owner());
create policy staff_owner_insert on public.staff_memberships for insert to authenticated
  with check (private.is_owner());
create policy staff_owner_update on public.staff_memberships for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy management_members_read on public.management_memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());
create policy management_members_owner_insert on public.management_memberships for insert to authenticated
  with check (private.is_owner());
create policy management_members_owner_update on public.management_memberships for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy customer_members_read on public.customer_memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());
create policy customer_members_owner_insert on public.customer_memberships for insert to authenticated
  with check (private.is_owner());
create policy customer_members_owner_update on public.customer_memberships for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

-- O primeiro proprietário é provisionado administrativamente (seed/CLI), nunca por cadastro público.

-- >>> 20261105120300_04_operacao.sql
-- 04: contratos, chamados, histórico, mensagens, notas internas, visitas, anexos e trilha de auditoria.
create table if not exists public.service_contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  contractor_type text not null check (contractor_type in ('customer','management')),
  contractor_management_id uuid references public.management_companies(id),
  contract_number text, title text not null check (length(trim(title)) >= 3),
  description text, starts_on date, ends_on date,
  maintenance_frequency text check (maintenance_frequency in ('weekly','biweekly','monthly','bimonthly','quarterly','semiannual','annual')),
  status text not null default 'draft' check (status in ('draft','active','suspended','expired','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint management_contractor_consistency check (
    (contractor_type = 'management' and contractor_management_id is not null)
    or (contractor_type = 'customer' and contractor_management_id is null)),
  constraint contract_dates check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create table if not exists public.contract_financials (
  contract_id uuid primary key references public.service_contracts(id) on delete cascade,
  monthly_value numeric(12,2) check (monthly_value >= 0), billing_notes text
);
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  customer_id uuid not null references public.customers(id),
  created_by uuid not null references public.user_profiles(user_id),
  title text not null check (length(trim(title)) >= 3),
  description text not null check (length(trim(description)) >= 5),
  category text not null default 'other'
    check (category in ('gate_stuck','automation','preventive','repair','metalwork','repaint','other')),
  location_detail text,
  priority text not null default 'normal' check (priority in ('low','normal','high','emergency')),
  status text not null default 'open'
    check (status in ('open','review','scheduled','in_progress','waiting_customer',
      'waiting_material','resolved','closed','cancelled')),
  assigned_to uuid references public.user_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create table if not exists public.ticket_status_history (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  old_status text, new_status text not null,
  actor_id uuid references public.user_profiles(user_id) on delete set null,
  changed_at timestamptz not null default now()
);
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.user_profiles(user_id),
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create table if not exists public.ticket_internal_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.user_profiles(user_id),
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create table if not exists public.technical_visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  contract_id uuid references public.service_contracts(id),
  ticket_id uuid references public.tickets(id),
  title text not null check (length(trim(title)) >= 3),
  scheduled_for timestamptz, completed_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  assigned_to uuid references public.user_profiles(user_id),
  result_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  uploaded_by uuid not null references public.user_profiles(user_id),
  object_path text not null unique, file_name text not null,
  mime_type text, size_bytes bigint check (size_bytes >= 0),
  visibility text not null default 'public' check (visibility in ('public','internal')),
  created_at timestamptz not null default now()
);
create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.user_profiles(user_id) on delete set null,
  action text not null, entity_name text not null,
  entity_id text, details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.service_contracts enable row level security;
alter table public.contract_financials enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_status_history enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_internal_notes enable row level security;
alter table public.technical_visits enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.audit_events enable row level security;

create index if not exists contracts_customer_idx on public.service_contracts(customer_id);
create index if not exists tickets_customer_created_idx on public.tickets(customer_id, created_at desc);
create index if not exists tickets_status_created_idx on public.tickets(status, created_at desc);
create index if not exists tickets_created_by_idx on public.tickets(created_by);
create index if not exists ticket_history_ticket_idx on public.ticket_status_history(ticket_id, changed_at);
create index if not exists ticket_messages_ticket_idx on public.ticket_messages(ticket_id, created_at);
create index if not exists ticket_notes_ticket_idx on public.ticket_internal_notes(ticket_id, created_at);
create index if not exists ticket_attachments_ticket_idx on public.ticket_attachments(ticket_id);
create index if not exists visits_customer_idx on public.technical_visits(customer_id, scheduled_for);
create index if not exists visits_scheduled_idx on public.technical_visits(scheduled_for) where status = 'scheduled';
create index if not exists audit_events_entity_idx on public.audit_events(entity_name, entity_id, created_at desc);
create index if not exists audit_events_created_idx on public.audit_events(created_at desc);

create trigger tickets_set_updated_at before update on public.tickets
  for each row execute function private.set_updated_at();
create trigger contracts_set_updated_at before update on public.service_contracts
  for each row execute function private.set_updated_at();
create trigger visits_set_updated_at before update on public.technical_visits
  for each row execute function private.set_updated_at();

-- >>> 20261105120400_05_regras_chamados.sql
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

-- >>> 20261105120500_06_politicas_operacao.sql
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

-- >>> 20261105120600_07_auditoria.sql
-- 07: auditoria automática de cadastros, vínculos, acessos e contratos.
-- Minimização: em UPDATE só os nomes das colunas alteradas; em INSERT/DELETE sem dados pessoais/financeiros.
create or replace function private.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  row_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  base jsonb := coalesce(row_new, row_old);
  sensitive text[] := array['email','phone','address_text','cnpj','legal_name','billing_notes','monthly_value','display_name'];
  details jsonb;
  actor uuid;
begin
  select p.user_id into actor from public.user_profiles p where p.user_id = (select auth.uid());
  if tg_op = 'UPDATE' then
    select jsonb_build_object('changed', coalesce(jsonb_agg(k), '[]'::jsonb)) into details
    from jsonb_object_keys(row_new) k
    where k <> 'updated_at' and row_new -> k is distinct from row_old -> k;
    if details -> 'changed' = '[]'::jsonb then return new; end if;
  else
    details := jsonb_build_object('row', base - sensitive);
  end if;
  insert into public.audit_events (actor_id, action, entity_name, entity_id, details)
  values (actor, lower(tg_op), tg_table_name,
    coalesce(base ->> 'id', base ->> 'contract_id',
      concat_ws(':', base ->> 'user_id', base ->> 'management_company_id', base ->> 'customer_id')), details);
  return coalesce(new, old);
end $$;
revoke all on function private.audit_row() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['management_companies','customers','management_assignments',
    'user_profiles','staff_memberships','management_memberships','customer_memberships',
    'service_contracts','contract_financials'] loop
    execute format('create trigger %I after insert or update or delete on public.%I
      for each row execute function private.audit_row()', t || '_audit', t);
  end loop;
end $$;

-- >>> 20261105120700_08_anexos_notificacoes.sql
-- 08: bucket privado de anexos e notificações internas.
-- Anexos: SEM policies em storage.objects para este bucket => clientes não leem nem gravam direto.
-- O servidor Nuxt valida o acesso pela RLS de ticket_attachments e usa a service role
-- (somente no servidor) para enviar arquivos e gerar URLs assinadas de curta duração.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-attachments', 'ticket-attachments', false, 10485760,
  array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  kind text not null check (kind in ('ticket_created','ticket_status','ticket_message')),
  title text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id) where read_at is null;

create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Usuário só pode marcar como lida; demais colunas são imutáveis para ele.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function private.status_label(p_status text)
returns text language sql immutable set search_path = '' as $$
  select case p_status
    when 'open' then 'Aberto' when 'review' then 'Em análise' when 'scheduled' then 'Agendado'
    when 'in_progress' then 'Em atendimento' when 'waiting_customer' then 'Aguardando cliente'
    when 'waiting_material' then 'Aguardando material' when 'resolved' then 'Resolvido'
    when 'closed' then 'Encerrado' when 'cancelled' then 'Cancelado' else p_status end;
$$;

create or replace function private.notify_ticket()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, ticket_id, kind, title)
    select s.user_id, new.id, 'ticket_created', format('Novo chamado #%s: %s', new.number, left(new.title, 80))
    from public.staff_memberships s join public.user_profiles p on p.user_id = s.user_id
    where s.active and p.active and s.user_id is distinct from actor;
  elsif new.status is distinct from old.status and new.created_by is distinct from actor then
    insert into public.notifications (user_id, ticket_id, kind, title)
    values (new.created_by, new.id, 'ticket_status',
      format('Chamado #%s: %s', new.number, private.status_label(new.status)));
  end if;
  return new;
end $$;
create trigger tickets_notify after insert or update of status on public.tickets
  for each row execute function private.notify_ticket();

create or replace function private.notify_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare t public.tickets;
begin
  select * into t from public.tickets where id = new.ticket_id;
  insert into public.notifications (user_id, ticket_id, kind, title)
  select distinct u, t.id, 'ticket_message', format('Nova mensagem no chamado #%s', t.number)
  from unnest(array[t.created_by, t.assigned_to]) as u
  where u is not null and u <> new.author_id;
  return new;
end $$;
create trigger ticket_messages_notify after insert on public.ticket_messages
  for each row execute function private.notify_message();

revoke all on function private.status_label(text) from public, anon, authenticated;
revoke all on function private.notify_ticket() from public, anon, authenticated;
revoke all on function private.notify_message() from public, anon, authenticated;

-- >>> 20261105120800_09_rpc_administrativas.sql
-- 09: operações administrativas atômicas (somente proprietário).
-- Troca/encerra a administradora de um cliente preservando o histórico.
create or replace function public.admin_set_customer_management(
  p_customer uuid, p_management uuid, p_effective_from date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not private.is_owner() then
    raise exception 'Somente o proprietário altera vínculos' using errcode = '42501';
  end if;
  if not exists (select 1 from public.customers where id = p_customer) then
    raise exception 'Cliente não encontrado' using errcode = 'P0002';
  end if;
  if p_management is not null and not exists (select 1 from public.management_companies where id = p_management) then
    raise exception 'Administradora não encontrada' using errcode = 'P0002';
  end if;
  select id into v_id from public.management_assignments
   where customer_id = p_customer and ended_at is null and management_company_id = p_management;
  if v_id is not null then return v_id; end if; -- já vinculado: nada a fazer
  update public.management_assignments set ended_at = now()
   where customer_id = p_customer and ended_at is null;
  if p_management is null then return null; end if;
  insert into public.management_assignments (management_company_id, customer_id, effective_from, source_system)
  values (p_management, p_customer, p_effective_from, 'portal') returning id into v_id;
  return v_id;
end $$;
revoke all on function public.admin_set_customer_management(uuid, uuid, date) from public, anon;
grant execute on function public.admin_set_customer_management(uuid, uuid, date) to authenticated;

-- >>> 20261105120900_10_indices_fk.sql
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

-- >>> 20261105121000_11_revogar_anon.sql
-- 11: defesa em profundidade. O portal nunca consulta dados sem login: o papel anon perde
-- os privilégios padrão do Supabase nas tabelas, sequências e funções do schema public
-- (a RLS já negava; agora nem a permissão de tabela existe). Projeto exclusivo do portal.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;
