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
