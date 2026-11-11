-- Estrutura operacional minima do portal. Interfaces e rotas serao criadas pelo Claude Code.
create table if not exists public.service_contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  contractor_type text not null check (contractor_type in ('customer','management')),
  contractor_management_id uuid references public.management_companies(id),
  contract_number text, title text not null,
  description text, starts_on date, ends_on date,
  maintenance_frequency text,
  status text not null default 'draft'
    check (status in ('draft','active','suspended','expired','closed')),
  created_at timestamptz not null default now(),
  constraint management_contractor_consistency check (
    (contractor_type = 'management' and contractor_management_id is not null)
    or (contractor_type = 'customer' and contractor_management_id is null)
  )
);
create table if not exists public.contract_financials (
  contract_id uuid primary key references public.service_contracts(id) on delete cascade,
  monthly_value numeric(12,2), billing_notes text
);
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  customer_id uuid not null references public.customers(id),
  created_by uuid not null references public.user_profiles(user_id),
  title text not null check (length(trim(title)) >= 3),
  description text not null check (length(trim(description)) >= 5),
  category text not null default 'other',
  location_detail text,
  priority text not null default 'normal'
    check (priority in ('low','normal','high','emergency')),
  status text not null default 'open'
    check (status in ('open','review','scheduled','in_progress','waiting_customer',
      'waiting_material','resolved','closed','cancelled')),
  assigned_to uuid references public.user_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create trigger tickets_set_updated_at before update on public.tickets
  for each row execute function public.pm_set_updated_at();
create index if not exists tickets_customer_created_idx
  on public.tickets(customer_id, created_at desc);
create index if not exists tickets_status_created_idx
  on public.tickets(status, created_at desc);

create table if not exists public.ticket_status_history (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  old_status text, new_status text not null,
  actor_id uuid references public.user_profiles(user_id),
  changed_at timestamptz not null default now()
);
create or replace function public.record_ticket_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ticket_status_history (ticket_id,old_status,new_status,actor_id)
    values (new.id,null,new.status,(select auth.uid()));
  elsif old.status is distinct from new.status then
    insert into public.ticket_status_history (ticket_id,old_status,new_status,actor_id)
    values (new.id,old.status,new.status,(select auth.uid()));
  end if;
  return new;
end $$;
create trigger tickets_record_status after insert or update of status on public.tickets
  for each row execute function public.record_ticket_status();

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.user_profiles(user_id),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create table if not exists public.ticket_internal_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.user_profiles(user_id),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create table if not exists public.technical_visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  contract_id uuid references public.service_contracts(id),
  ticket_id uuid references public.tickets(id),
  title text not null, scheduled_for timestamptz,
  completed_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','completed','cancelled')),
  assigned_to uuid references public.user_profiles(user_id),
  result_summary text,
  created_at timestamptz not null default now()
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
  actor_id uuid references public.user_profiles(user_id),
  action text not null, entity_name text not null,
  entity_id text, details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
