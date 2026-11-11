# Plano de limpeza dos objetos do portal no projeto ANTIGO `fbzkhxfcsxkqrpqfitwr`

> **NÃO EXECUTAR sem autorização explícita do responsável.** O projeto antigo continua
> atendendo o site institucional (leads, serviços, slides, `admin_users` e Auth com usuários reais).
> Este documento só descreve o que foi criado ali em 04/11/2026 e como remover com segurança.

## O que o portal criou no projeto antigo (migrations 01–05 do pacote original)

Registrado em `supabase_migrations.schema_migrations` com as versões `20261104150000` a `20261104150400`.

- **16 tabelas em `public`, todas vazias** (0 linhas, conferido em 04/11):
  - `management_companies`, `customers`, `management_assignments`;
  - `user_profiles`, `staff_memberships`, `management_memberships`, `customer_memberships`;
  - `service_contracts`, `contract_financials`;
  - `tickets`, `ticket_status_history`, `ticket_messages`, `ticket_internal_notes`;
  - `technical_visits`, `ticket_attachments`, `audit_events`.
  
  As policies, índices e triggers dessas tabelas são removidos junto com elas.
- **9 funções em `public`:**
  - `is_staff()`, `is_owner()`;
  - `can_read_management(uuid)`, `can_read_customer(uuid)`, `can_read_ticket(uuid,uuid)`, `can_read_contract(uuid)`;
  - `create_auth_profile()`, `record_ticket_status()`, `pm_set_updated_at()`.
- **1 trigger em `auth.users`:** `on_portamovel_auth_user_created`. É o ponto mais sensível, porque o Auth é compartilhado com o site.
  Enquanto existir, todo usuário novo do site ganha uma linha em `public.user_profiles`. Isso não tem efeito funcional,
  mas é um resíduo a remover.
- **O que NÃO foi criado ali:** o schema `private` e as migrations 06, 07 e 08 (nunca aplicadas).
  A extensão `pgcrypto` já existia antes e **não** deve ser removida.

## Pré-requisitos

1. Fazer o backup completo com `scripts/backup-supabase.ps1` e validá-lo com `scripts/validar_backup.py`.
2. Confirmar que as tabelas do portal continuam vazias e que nenhuma função do site depende delas
   (consultas de verificação no início do SQL abaixo).
3. Fazer em horário de baixo uso e avisar quem administra o site.

## Ordem segura (sem CASCADE)

1. Remover **primeiro** o trigger de `auth.users`. Se as tabelas caírem antes, o trigger quebraria cadastros e convites do site.
2. Remover as tabelas, das filhas para as mães, sem `CASCADE`. Se algo inesperado depender delas, o comando falha e nada muda.
3. Remover as 9 funções.
4. Apagar os 5 registros de histórico de migration do portal.
5. Rodar os advisors de segurança e testar o login e o convite do painel do site.

## SQL proposto (padrão: termina em ROLLBACK, isto é, ensaio)

```sql
begin;
-- Verificações: devem retornar 0 / nenhuma linha
select (select count(*) from public.customers) + (select count(*) from public.tickets)
     + (select count(*) from public.user_profiles) as linhas_portal;  -- user_profiles pode ter linhas criadas pelo trigger: revisar antes
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosrc ~ '(is_staff|is_owner|can_read_|create_auth_profile|record_ticket_status|pm_set_updated_at)'
   and p.proname not in ('is_staff','is_owner','can_read_management','can_read_customer','can_read_ticket',
                         'can_read_contract','create_auth_profile','record_ticket_status','pm_set_updated_at');

drop trigger on_portamovel_auth_user_created on auth.users;

drop table public.ticket_attachments, public.ticket_internal_notes, public.ticket_messages,
           public.ticket_status_history, public.technical_visits;
drop table public.tickets, public.contract_financials, public.service_contracts, public.audit_events;
drop table public.customer_memberships, public.management_memberships, public.staff_memberships;
drop table public.management_assignments, public.user_profiles, public.customers, public.management_companies;

drop function public.can_read_ticket(uuid, uuid), public.can_read_contract(uuid),
              public.can_read_customer(uuid), public.can_read_management(uuid),
              public.is_owner(), public.is_staff(),
              public.create_auth_profile(), public.record_ticket_status(), public.pm_set_updated_at();

delete from supabase_migrations.schema_migrations
 where version in ('20261104150000','20261104150100','20261104150200','20261104150300','20261104150400');

rollback;  -- trocar por COMMIT somente após autorização e ensaio bem-sucedido
```

## Riscos e reversão

- Não há dados do portal no projeto antigo, então a remoção não perde informação de negócio.
- Se algo falhar no meio, a transação inteira é desfeita.
- Para recriar os objetos, basta reaplicar as migrations em `supabase/legacy-projeto-antigo/` (01 a 05).
- Ponto de atenção: a `set_updated_at()` do site **não** é tocada. A do portal tinha outro nome (`pm_set_updated_at`).
