# A Porta Móvel — Pacote de implantação Supabase e migração do cadastro SQL Server

Este pacote contém **estrutura SQL inicial**, **exportador de SQL Server**, **importador PostgreSQL para Supabase** e **prompt revisado para Claude Code**.

> **Importante:** nenhum dado real foi enviado ao Supabase. Os scripts estão prontos para uso quando você disponibilizar SQL Server restaurado, banco Supabase autorizado e credenciais **locais**. Não exponha essas credenciais no chat ou no repositório.

## Conteúdo

- `PROMPT_CLAUDE_CODE_PORTAMOVEL_V2.md` — prompt atualizado, completo e alinhado ao cadastro real.
- `supabase/migrations/20261104150000_01_cadastros.sql` — administradoras, clientes, vínculos e códigos legados.
- `supabase/migrations/20261104150100_02_identidade_acessos.sql` — perfis, vínculos com usuários, verificações de acesso.
- `supabase/migrations/20261104150200_03_politicas_cadastros.sql` — RLS dos cadastros.
- `supabase/migrations/20261104150300_04_operacao.sql` — contratos, chamados, visitas e trilha de auditoria.
- `supabase/migrations/20261104150400_05_politicas_operacao.sql` — RLS de chamados, contratos e notas.
- `supabase/INSTALAR_TUDO_SQL_EDITOR.sql` — alternativa consolidada para colar no SQL Editor, só uma vez.
- `migracao/export_sqlserver.py` — exportação com seleção de colunas e relatório.
- `migracao/import_supabase.py` — dry-run e importação idempotente/atômica.
- `migracao/.env.example` — exemplo de parâmetros locais.
- `migracao/requirements.txt` — dependências Python.
- `migracao/demo_passwords.local.env` — exemplos de senhas locais para contas fictícias; não inclua no Git e não use em produção.

## Passo 1 — Restaurar o backup em um SQL Server separado

1. Instale/use Microsoft SQL Server e SQL Server Management Studio (SSMS) em um ambiente controlado.
2. Em **Databases → Restore Database → Device**, selecione o arquivo `Samuel_04-11-2026.bak`.
3. Dê um nome novo para o banco, por exemplo `Samuel_Importacao`. **Não sobrescreva seu banco existente**.
4. Na guia **Files**, indique os caminhos corretos dos arquivos de dados e log para o servidor local.
5. Execute a restauração e confirme as tabelas `dbo.Administradora` e `dbo.Cliente`.

Se preferir T-SQL, obtenha primeiro os nomes lógicos dos arquivos:

```sql
RESTORE FILELISTONLY FROM DISK = N'C:\caminho\Samuel_04-11-2026.bak';
```

Depois use `RESTORE DATABASE ... WITH MOVE` com os nomes lógicos retornados e caminhos válidos no **servidor**. Nunca usar `WITH REPLACE` sobre produção.

## Passo 2 — Exportar os campos do SQL Server

Instale Python 3.11+ e o **Microsoft ODBC Driver 18 for SQL Server**, depois no terminal:

```bash
python -m pip install -r migracao/requirements.txt
```

Crie variáveis de ambiente locais (o `.env.example` não é lido automaticamente por estes scripts):

**PowerShell:**

```powershell
$env:SQLSERVER_CONN_STR = 'DRIVER={ODBC Driver 18 for SQL Server};SERVER=localhost;DATABASE=Samuel_Importacao;UID=sa;PWD=SUA_SENHA;Encrypt=yes;TrustServerCertificate=yes'
python migracao/export_sqlserver.py --inspect
python migracao/export_sqlserver.py --out migracao/private_export
```

O diretório `private_export` fica fora do versionamento. Por padrão, o exportador carrega código legado, nomes, CNPJ apenas quando existem **14 dígitos** e status, **sem e-mail, endereço ou telefone**.

Para incluir endereço, telefone e e-mail **somente após revisar a necessidade e autorização**:

```powershell
python migracao/export_sqlserver.py --out migracao/private_export --include-contact-fields
```

Arquivos gerados: `administradoras.csv`, `clientes.csv`, `relatorio_exportacao.json`.

> A exportação não migra documentos pessoais, observações livres, contatos de responsáveis nem senhas. Clientes são inicialmente classificados como `unclassified` para revisão posterior.

## Passo 3 — Criar as tabelas no Supabase

No projeto **de desenvolvimento**, use a CLI oficial (com acesso autorizado):

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

Execute os comandos na pasta raiz **deste pacote**, onde está `supabase/migrations`.

Alternativa: executar o arquivo `supabase/INSTALAR_TUDO_SQL_EDITOR.sql` **uma única vez** no SQL Editor de um projeto vazio. **Escolha CLI ou SQL Editor, nunca ambos para as mesmas migrations**, pois políticas RLS duplicadas irão gerar erros. Não aplique o pacote em produção sem revisão prévia.

## Passo 4 — Conferência sem upload (recomendado)

```powershell
python migracao/import_supabase.py --input migracao/private_export
```

O programa imprime uma prévia de quantos registros e vínculos serão importados e identifica possíveis referências órfãs. **Não se conecta ao Supabase em modo de conferência**.

## Passo 5 — Importar de verdade (somente com autorização)

Primeiro, obtenha a URI de conexão PostgreSQL do **projeto correto** em Supabase. Use SSL e não exponha a senha.

**PowerShell:**

```powershell
$env:SUPABASE_DB_URL = 'postgresql://USUARIO:SENHA@HOST:5432/postgres?sslmode=require'
$env:MIGRATION_CONFIRM = 'I_UNDERSTAND_THIS_UPLOADS_REAL_CUSTOMER_DATA'
python migracao/import_supabase.py --input migracao/private_export --apply
```

O script importa as duas tabelas e só cria vínculos quando a administradora correspondente existe. Uma falha reverte a transação. Se um código legado já existir, o cadastro não é sobrescrito. Se o vínculo existente divergir da origem, o script contabiliza o conflito sem alterá-lo.

**O importador não cria logins, senhas ou convites.** Autorizações de usuários são um processo separado no novo sistema.

## Passo 6 — Conferir no Supabase

Rode no SQL Editor:

```sql
select count(*) as administradoras_importadas
  from public.management_companies
  where legacy_source = 'portamovel_sqlserver_2026_11_04';
select count(*) as clientes_importados
  from public.customers
  where legacy_source = 'portamovel_sqlserver_2026_11_04';
select count(*) as vinculos_importados
  from public.management_assignments
  where source_system = 'portamovel_sqlserver_2026_11_04' and ended_at is null;
select customer_kind, count(*) from public.customers
  where legacy_source = 'portamovel_sqlserver_2026_11_04'
  group by customer_kind;
```

Confronte esses totais com o relatório de exportação, não apenas com números relatados antes da restauração.

## Limites e verificações restantes

- O `.bak` precisa de um **SQL Server** para restauração oficial: o pacote não transforma os arquivos binários em PostgreSQL sozinho.
- Campos exatos e tipos devem ser confirmados pela exportação da base restaurada.
- As policies para arquivos privados em **Supabase Storage** ainda precisam ser implementadas e testadas pelo Claude Code antes de habilitar anexos.
- O pacote cria o **schema inicial**, não o frontend nem as contas demonstrativas. Esses são entregáveis do prompt do Claude Code.
- Usuários iniciais com papel `owner` exigem bootstrap administrativo controlado.
- Antes de produção: teste RLS, autorização, backup, direitos dos titulares, retenção e classificação de clientes.
