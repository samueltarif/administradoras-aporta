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
