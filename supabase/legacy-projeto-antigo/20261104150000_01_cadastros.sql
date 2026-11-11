-- Porta Movel: entidades cadastrais e vinculos do legado. Executar no Supabase.
create extension if not exists pgcrypto;

create table if not exists public.management_companies (
  id uuid primary key default gen_random_uuid(),
  legacy_source text, legacy_code text,
  trade_name text not null, legal_name text,
  cnpj text, email text, phone text, address_text text,
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
  trade_name text not null, legal_name text,
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
  effective_from date, -- Data historica desconhecida no backup; NAO inventar.
  recorded_at timestamptz not null default now(),
  ended_at timestamptz,
  source_system text not null default 'portal',
  constraint ended_after_recorded check (ended_at is null or ended_at >= recorded_at)
);
-- A base legada fornece uma administradora ativa por cliente.
create unique index if not exists management_one_active_per_customer
  on public.management_assignments(customer_id) where ended_at is null;
create index if not exists management_assignments_company_idx
  on public.management_assignments(management_company_id) where ended_at is null;
create index if not exists customers_trade_name_idx on public.customers (trade_name);
create index if not exists management_trade_name_idx on public.management_companies (trade_name);

create or replace function public.pm_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.pm_set_updated_at();
create trigger management_set_updated_at before update on public.management_companies
  for each row execute function public.pm_set_updated_at();
