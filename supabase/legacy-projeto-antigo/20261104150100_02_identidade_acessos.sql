-- Separar usuarios autenticados dos cadastros importados.
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
create index if not exists management_memberships_company_idx
  on public.management_memberships(management_company_id, active);
create index if not exists customer_memberships_customer_idx
  on public.customer_memberships(customer_id, active);

-- RLS habilitada ja na criacao (a migration 03 repete o enable, sem efeito colateral).
alter table public.user_profiles enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.management_memberships enable row level security;
alter table public.customer_memberships enable row level security;
alter table public.management_companies enable row level security;
alter table public.customers enable row level security;
alter table public.management_assignments enable row level security;

create or replace function public.create_auth_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (user_id) do nothing;
  return new;
end $$;
create trigger on_portamovel_auth_user_created after insert on auth.users
  for each row execute function public.create_auth_profile();

-- SECURITY DEFINER evita recursao das policies, sem confiar em roles fornecidas pelo cliente.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_memberships s
    join public.user_profiles p on p.user_id = s.user_id
    where s.user_id = (select auth.uid()) and s.active and p.active
  );
$$;
create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_memberships s
    join public.user_profiles p on p.user_id = s.user_id
    where s.user_id = (select auth.uid()) and s.active and p.active
      and s.staff_role = 'owner'
  );
$$;
create or replace function public.can_read_management(p_management uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff() or exists (
    select 1 from public.management_memberships mm
    join public.user_profiles p on p.user_id = mm.user_id
    where mm.user_id = (select auth.uid()) and mm.active and p.active
      and mm.management_company_id = p_management
  ) or exists (
    select 1 from public.management_assignments ma
    join public.customer_memberships cm on cm.customer_id = ma.customer_id
    join public.user_profiles p on p.user_id = cm.user_id
    where ma.management_company_id = p_management and ma.ended_at is null
      and cm.user_id = (select auth.uid()) and cm.active and p.active
  );
$$;
create or replace function public.can_read_customer(p_customer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff() or exists (
    select 1 from public.customer_memberships cm
    join public.user_profiles p on p.user_id = cm.user_id
    where cm.user_id = (select auth.uid()) and cm.active and p.active
      and cm.customer_id = p_customer
  ) or exists (
    select 1 from public.management_assignments ma
    join public.management_memberships mm
      on mm.management_company_id = ma.management_company_id
    join public.user_profiles p on p.user_id = mm.user_id
    where ma.customer_id = p_customer and ma.ended_at is null
      and mm.user_id = (select auth.uid()) and mm.active and p.active
  );
$$;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_owner() from public, anon;
revoke all on function public.can_read_management(uuid) from public, anon;
revoke all on function public.can_read_customer(uuid) from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.can_read_management(uuid) to authenticated;
grant execute on function public.can_read_customer(uuid) to authenticated;
