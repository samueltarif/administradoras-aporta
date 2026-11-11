-- 08: bucket privado de anexos e notificações internas.
-- Anexos: SEM policies em storage.objects para este bucket => clientes não leem nem gravam direto.
-- O servidor Nuxt valida o acesso pela RLS de ticket_attachments e usa a service role
-- (somente no servidor) para enviar arquivos e gerar URLs assinadas de curta duração.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-attachments', 'ticket-attachments', false, 10485760,
  array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  kind text not null check (kind in ('ticket_created','ticket_status','ticket_message')),
  title text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id) where read_at is null;

create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Usuário só pode marcar como lida; demais colunas são imutáveis para ele.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function private.status_label(p_status text)
returns text language sql immutable set search_path = '' as $$
  select case p_status
    when 'open' then 'Aberto' when 'review' then 'Em análise' when 'scheduled' then 'Agendado'
    when 'in_progress' then 'Em atendimento' when 'waiting_customer' then 'Aguardando cliente'
    when 'waiting_material' then 'Aguardando material' when 'resolved' then 'Resolvido'
    when 'closed' then 'Encerrado' when 'cancelled' then 'Cancelado' else p_status end;
$$;

create or replace function private.notify_ticket()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, ticket_id, kind, title)
    select s.user_id, new.id, 'ticket_created', format('Novo chamado #%s: %s', new.number, left(new.title, 80))
    from public.staff_memberships s join public.user_profiles p on p.user_id = s.user_id
    where s.active and p.active and s.user_id is distinct from actor;
  elsif new.status is distinct from old.status and new.created_by is distinct from actor then
    insert into public.notifications (user_id, ticket_id, kind, title)
    values (new.created_by, new.id, 'ticket_status',
      format('Chamado #%s: %s', new.number, private.status_label(new.status)));
  end if;
  return new;
end $$;
create trigger tickets_notify after insert or update of status on public.tickets
  for each row execute function private.notify_ticket();

create or replace function private.notify_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare t public.tickets;
begin
  select * into t from public.tickets where id = new.ticket_id;
  insert into public.notifications (user_id, ticket_id, kind, title)
  select distinct u, t.id, 'ticket_message', format('Nova mensagem no chamado #%s', t.number)
  from unnest(array[t.created_by, t.assigned_to]) as u
  where u is not null and u <> new.author_id;
  return new;
end $$;
create trigger ticket_messages_notify after insert on public.ticket_messages
  for each row execute function private.notify_message();

revoke all on function private.status_label(text) from public, anon, authenticated;
revoke all on function private.notify_ticket() from public, anon, authenticated;
revoke all on function private.notify_message() from public, anon, authenticated;
