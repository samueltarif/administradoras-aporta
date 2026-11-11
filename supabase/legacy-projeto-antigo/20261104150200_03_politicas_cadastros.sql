-- RLS: acesso aos cadastros condicionado aos vinculos autorizados.
alter table public.management_companies enable row level security;
alter table public.customers enable row level security;
alter table public.management_assignments enable row level security;
alter table public.user_profiles enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.management_memberships enable row level security;
alter table public.customer_memberships enable row level security;

create policy management_read on public.management_companies for select to authenticated
  using (public.can_read_management(id));
create policy management_owner_insert on public.management_companies for insert to authenticated
  with check (public.is_owner());
create policy management_owner_update on public.management_companies for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy customers_read on public.customers for select to authenticated
  using (public.can_read_customer(id));
create policy customers_owner_insert on public.customers for insert to authenticated
  with check (public.is_owner());
create policy customers_owner_update on public.customers for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy assignments_read on public.management_assignments for select to authenticated
  using (public.can_read_customer(customer_id)
    or public.can_read_management(management_company_id));
create policy assignments_owner_insert on public.management_assignments for insert to authenticated
  with check (public.is_owner());
create policy assignments_owner_update on public.management_assignments for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy user_profiles_read on public.user_profiles for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());
create policy user_profiles_owner_update on public.user_profiles for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy staff_read on public.staff_memberships for select to authenticated
  using (user_id = (select auth.uid()) or public.is_owner());
create policy staff_owner_insert on public.staff_memberships for insert to authenticated
  with check (public.is_owner());
create policy staff_owner_update on public.staff_memberships for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy management_members_read on public.management_memberships for select to authenticated
  using (user_id = (select auth.uid()) or public.is_owner());
create policy management_members_owner_insert on public.management_memberships for insert to authenticated
  with check (public.is_owner());
create policy management_members_owner_update on public.management_memberships for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy customer_members_read on public.customer_memberships for select to authenticated
  using (user_id = (select auth.uid()) or public.is_owner());
create policy customer_members_owner_insert on public.customer_memberships for insert to authenticated
  with check (public.is_owner());
create policy customer_members_owner_update on public.customer_memberships for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- O primeiro owner deve ser provisionado administrativamente, nunca por signup publico.
