-- 06: tira as funcoes auxiliares de RLS da API publica (/rest/v1/rpc) e
-- restringe o acesso de atendentes. As policies seguem a funcao pelo OID.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_staff() set schema private;
alter function public.is_owner() set schema private;
alter function public.can_read_management(uuid) set schema private;
alter function public.can_read_customer(uuid) set schema private;
alter function public.can_read_ticket(uuid, uuid) set schema private;
alter function public.can_read_contract(uuid) set schema private;

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
      and cm.user_id = (select auth.uid()) and cm.active and p.active
  );
$$;

create or replace function private.can_read_customer(p_customer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_staff() or exists (
    select 1 from public.customer_memberships cm
    join public.user_profiles p on p.user_id = cm.user_id
    where cm.user_id = (select auth.uid()) and cm.active and p.active
      and cm.customer_id = p_customer
  ) or exists (
    select 1 from public.management_assignments ma
    join public.management_memberships mm on mm.management_company_id = ma.management_company_id
    join public.user_profiles p on p.user_id = mm.user_id
    where ma.customer_id = p_customer and ma.ended_at is null
      and mm.user_id = (select auth.uid()) and mm.active and p.active
  );
$$;

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
    where cm.customer_id = p_customer and cm.user_id = (select auth.uid())
      and cm.active and p.active
      and (cm.member_role <> 'porter' or p_creator = (select auth.uid()))
  );
$$;

-- Contratos: apenas gestor da administradora (atendente nao), sindico ou responsavel.
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
    where cm.customer_id = p_customer and cm.user_id = (select auth.uid())
      and cm.active and p.active and cm.member_role in ('syndic','representative')
  );
$$;

-- Visitas: operacionais; atendente ve, porteiro nao.
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
    where cm.customer_id = p_customer and cm.user_id = (select auth.uid())
      and cm.active and p.active and cm.member_role in ('syndic','representative')
  );
$$;

drop policy visits_read on public.technical_visits;
create policy visits_read on public.technical_visits for select to authenticated
  using (private.can_read_visit(customer_id));

do $$
declare f text;
begin
  foreach f in array array['private.is_staff()','private.is_owner()',
    'private.can_read_management(uuid)','private.can_read_customer(uuid)',
    'private.can_read_ticket(uuid,uuid)','private.can_read_contract(uuid)',
    'private.can_read_visit(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  -- Funcoes de trigger nao devem ser chamaveis via RPC.
  foreach f in array array['public.create_auth_profile()','public.record_ticket_status()',
    'public.pm_set_updated_at()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $$;
