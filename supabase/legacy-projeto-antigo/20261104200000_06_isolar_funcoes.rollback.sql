-- ROLLBACK da migration 06. Nao altera dados. Executar somente se necessario,
-- e ANTES de qualquer rollback, desfazer 07/08 (elas criam objetos em "private").
-- Estado capturado antes da 06 (04/11/2026): md5(pg_get_functiondef) em public.*:
--   is_staff 78d315a5f25d4aa14b73939712e2a7ee | is_owner b151c7fc9ee9f983b17249f251709c96
--   can_read_management d77b45f0224c108df204530820ec58d8 | can_read_customer f074be9881907f9df563a61f963f2764
--   can_read_ticket faa274468059a237d6702c21565fe3f3 | can_read_contract f34d668c743a82114263f99ee02727e9
--   policy technical_visits.visits_read: SELECT to authenticated using can_read_contract(customer_id)
begin;

-- 1) Policy de visitas volta a usar can_read_contract; remove a funcao nova.
drop policy visits_read on public.technical_visits;
create policy visits_read on public.technical_visits for select to authenticated
  using (private.can_read_contract(customer_id));
drop function private.can_read_visit(uuid);

-- 2) Funcoes voltam ao schema public (policies acompanham pelo OID).
alter function private.is_staff() set schema public;
alter function private.is_owner() set schema public;
alter function private.can_read_management(uuid) set schema public;
alter function private.can_read_customer(uuid) set schema public;
alter function private.can_read_ticket(uuid, uuid) set schema public;
alter function private.can_read_contract(uuid) set schema public;

-- 3) Corpos originais (02 e 05), referenciando public.is_staff().
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
create or replace function public.can_read_ticket(p_customer uuid, p_creator uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff() or exists (
    select 1 from public.management_assignments ma
    join public.management_memberships mm
      on mm.management_company_id = ma.management_company_id
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
create or replace function public.can_read_contract(p_customer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff() or exists (
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

-- 4) Permissoes anteriores (ACL capturada antes da 06).
grant execute on function public.create_auth_profile(), public.record_ticket_status(),
  public.pm_set_updated_at() to public, anon, authenticated;

-- 5) Remove o schema SEM cascade: falha (e reverte tudo) se restar qualquer objeto.
drop schema private;
commit;

-- Verificacao: os md5 devem coincidir com os do cabecalho (can_read_* podem diferir
-- apenas em formatacao; compare o texto com as migrations 02 e 05 se necessario).
-- select p.proname, md5(pg_get_functiondef(p.oid)) from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname in ('is_staff','is_owner','can_read_management',
--    'can_read_customer','can_read_ticket','can_read_contract');
