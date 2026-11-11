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
