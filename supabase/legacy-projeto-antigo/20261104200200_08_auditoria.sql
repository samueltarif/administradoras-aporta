-- 08: auditoria automatica de cadastros, vinculos, acessos e contratos.
-- Minimizacao: em UPDATE so registra os nomes das colunas alteradas; em INSERT/DELETE
-- remove campos pessoais e financeiros. Leitura restrita ao proprietario (policy da 05).
create or replace function private.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  row_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  base jsonb := coalesce(row_new, row_old);
  sensitive text[] := array['email','phone','address_text','cnpj','legal_name','billing_notes','monthly_value'];
  details jsonb;
  actor uuid;
begin
  select p.user_id into actor from public.user_profiles p where p.user_id = (select auth.uid());
  if tg_op = 'UPDATE' then
    select jsonb_build_object('changed', coalesce(jsonb_agg(k), '[]'::jsonb)) into details
    from jsonb_object_keys(row_new) k
    where k not in ('updated_at') and row_new -> k is distinct from row_old -> k;
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

-- A trilha nao deve impedir a exclusao de um usuario: o autor vira NULL.
alter table public.audit_events drop constraint if exists audit_events_actor_id_fkey;
alter table public.audit_events add constraint audit_events_actor_id_fkey
  foreign key (actor_id) references public.user_profiles(user_id) on delete set null;

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
create index if not exists audit_events_entity_idx on public.audit_events(entity_name, entity_id, created_at desc);
create index if not exists audit_events_created_idx on public.audit_events(created_at desc);
