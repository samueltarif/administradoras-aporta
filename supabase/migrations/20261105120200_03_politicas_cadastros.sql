-- 03: RLS dos cadastros e vínculos. Negação por padrão; escrita só do proprietário.
create policy management_read on public.management_companies for select to authenticated
  using (private.can_read_management(id));
create policy management_owner_insert on public.management_companies for insert to authenticated
  with check (private.is_owner());
create policy management_owner_update on public.management_companies for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy customers_read on public.customers for select to authenticated
  using (private.can_read_customer(id));
create policy customers_owner_insert on public.customers for insert to authenticated
  with check (private.is_owner());
create policy customers_owner_update on public.customers for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy assignments_read on public.management_assignments for select to authenticated
  using (private.can_read_customer(customer_id) or private.can_read_management(management_company_id));
create policy assignments_owner_insert on public.management_assignments for insert to authenticated
  with check (private.is_owner());
create policy assignments_owner_update on public.management_assignments for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy user_profiles_read on public.user_profiles for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());
create policy user_profiles_owner_update on public.user_profiles for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy staff_read on public.staff_memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_owner());
create policy staff_owner_insert on public.staff_memberships for insert to authenticated
  with check (private.is_owner());
create policy staff_owner_update on public.staff_memberships for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy management_members_read on public.management_memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());
create policy management_members_owner_insert on public.management_memberships for insert to authenticated
  with check (private.is_owner());
create policy management_members_owner_update on public.management_memberships for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy customer_members_read on public.customer_memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());
create policy customer_members_owner_insert on public.customer_memberships for insert to authenticated
  with check (private.is_owner());
create policy customer_members_owner_update on public.customer_memberships for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

-- O primeiro proprietário é provisionado administrativamente (seed/CLI), nunca por cadastro público.
