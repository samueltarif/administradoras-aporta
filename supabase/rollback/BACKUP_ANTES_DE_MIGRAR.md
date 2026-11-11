# Backup do projeto Supabase compartilhado (`fbzkhxfcsxkqrpqfitwr`)

O projeto atende o **site institucional** e o **portal**. O plano Free não tem backup automático
nem PITR, então o backup é **manual e obrigatório** antes de qualquer migration.

## Como gerar (Windows, na raiz do projeto)

1. Abra o Docker Desktop. Na falta dele, tenha o `pg_dump` 17+ no PATH.
2. No painel do Supabase, abra **Connect → Session pooler** e copie a connection string,
   que vem com `[YOUR-PASSWORD]` no lugar da senha.
3. Rode:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\backup-supabase.ps1
   ```
   Cole a string e digite a senha quando pedir. A senha fica oculta e não é gravada em lugar nenhum.
4. Para validar, rode `python scripts/validar_backup.py backups/<pasta>` ou peça ao Claude.

## O que cada arquivo cobre

| Arquivo | Conteúdo |
|---|---|
| `roles.sql` | papéis personalizados, sem senhas (só no modo CLI) |
| `schema.sql` | estrutura de `public` (site e portal): tabelas, funções, policies RLS, triggers, grants |
| `data.sql` | **dados de todos os schemas**, inclusive `auth`, `storage` e `public` |
| `history_*.sql` | histórico de migrations (`supabase_migrations`) |
| `managed_auth_storage.sql` | estrutura de `auth` e `storage` (opcional) |
| `manifest.json` | tamanho e SHA-256 de cada arquivo |

Os dados de `auth` cobrem usuários, identidades, hashes de senha, sessões e refresh tokens.

O dump de estrutura padrão **exclui** `auth` e `storage`. A única personalização nesses schemas é o
trigger do portal `on_portamovel_auth_user_created`. Ele também está versionado em
`personalizacoes_schemas_gerenciados.sql` e na migration 02. O site não tem personalizações ali:
0 policies e 0 objetos fora dos donos padrão (verificado em 05/11/2026).

## O que NÃO está em nenhum dump do banco

- Configuração do Auth: Site URL, Redirect URLs, provedores, SMTP, templates de e-mail, rate limits.
  Anote ou capture as telas de **Authentication → URL Configuration / Email Templates / Providers**.
- Chaves de API, JWT secret, configuração da Data API (schemas expostos: `public` e `graphql_public`).
- Arquivos do Storage: hoje são 0 buckets. As mídias do site ficam no Cloudflare R2, fora do Supabase.
- Edge Functions (nenhuma), Vault (0 segredos) e cron (não instalado).

## Guarda e segurança

- A pasta `backups/` está no `.gitignore`. O script se recusa a gravar dentro do repositório sem essa proteção.
- Os arquivos contêm dados pessoais (leads) e hashes de senha e tokens. Depois de validados:
  1. compacte com senha (7-Zip, AES-256) ou mova para um disco com BitLocker;
  2. apague a cópia aberta da pasta do projeto;
  3. guarde a senha do arquivo fora do computador.
- Refresh tokens envelhecem rápido. Para restaurar sessões, o backup só tem valor por poucos dias.

## Limitações de recuperação

- **Rollback de migration** (caso esperado): use o script em `supabase/rollback/`. Não exige restaurar o banco.
- **Restauração total no mesmo projeto**: não é automática no plano Free.
  - Exige `psql` com `--single-transaction` sobre um banco limpo, e o projeto fica indisponível durante o processo.
  - Há risco de conflito com dados gravados depois do backup, como leads novos do site.
- **Restauração em projeto novo**:
  - o JWT secret e as chaves mudam: será preciso atualizar o `.env` do site e do portal;
  - as sessões ativas caem, mas as senhas continuam válidas (os hashes são restaurados);
  - é preciso reconfigurar o Auth manualmente.
- Dados gravados entre o backup e uma eventual restauração se perdem. Faça o backup imediatamente antes da migration.
