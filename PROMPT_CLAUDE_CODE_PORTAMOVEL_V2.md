# PROMPT MASTER — A PORTA MÓVEL | PORTAL DE CLIENTES E MIGRAÇÃO SQL SERVER → SUPABASE

Você é o arquiteto principal, engenheiro full-stack, DBA PostgreSQL e especialista em segurança encarregado de construir **o Portal A Porta Móvel**, partindo de uma instalação praticamente vazia do **Nuxt 4, Vue 3 e Tailwind CSS**.

**Objetivo:** entregar um SaaS corporativo funcional para administração de clientes, condomínios, administradoras, contratos mensais, visitas técnicas, chamados e autenticação com controle de acesso por organização. Não entregar telas estáticas, mocks persistidos no frontend ou botões sem ação.

## 1. VERDADEIRA ORIGEM DOS DADOS

A A Porta Móvel forneceu o backup `Samuel_04-11-2026.bak`, do **Microsoft SQL Server**. Foi possível identificar a estrutura cadastral legada:

- Tabela `Administradora`: campos conhecidos `Codigo`, `Fantasia`, `Razao`, `CNPJ`, `Endereco`, `Contato`, `Email`, `Status`.
- Tabela `Cliente`: campos conhecidos `CodCliente`, `Fantasia`, `Razao`, `CNPJ`, `Endereco`, `Contato`, `Email`, `CodAdministradora`.
- Relacionamento: `Cliente.CodAdministradora → Administradora.Codigo`.
- A tabela `Cliente` não contém exclusivamente condomínios: pode incluir outros tipos de clientes, inclusive pessoas físicas.
- Uma administradora pode ter vários clientes; um cliente pode estar sem administradora.
- Há indícios de administradoras sem clientes vinculados, documento repetido e ao menos um código de vínculo inconsistente; não fazer joins pelo CNPJ, pelo nome ou por suposição.
- Números preliminares a conferir ao restaurar o backup: cerca de 189 administradoras, 1.594 clientes, 790 vínculos válidos, 803 sem vínculo e 1 referência inconsistente. Não fixar esses números no código; o script deve reconcilia-los com os dados reais.

**CRÍTICO:** não é possível restaurar um `.bak` de SQL Server diretamente no Supabase PostgreSQL. O pacote do repositório contém `migracao/export_sqlserver.py`, `migracao/import_supabase.py` e migrations SQL. Trate esses arquivos como ponto de partida e mantenha sua compatibilidade; primeiro analise e teste, depois amplie com migrations incrementais sem criar tabelas concorrentes com nomes diferentes. A restauração deve acontecer em um SQL Server isolado. Nunca executar o backup como SQL nem declarar importação concluída sem conexão real.

**Não fazer upload de dados de clientes reais, operar em produção ou enviar cadastros para terceiros sem aprovação explícita.** Iniciar o desenvolvimento usando apenas seed fictício. Importação real deve ter modo de pré-visualização/dry-run, confirmação de destino e controle de acesso.

## 2. STACK, MCPs E RESTRIÇÕES

Obrigatório: Nuxt 4, Vue 3, TypeScript, Tailwind CSS compatível com a versão do projeto, Supabase Auth, PostgreSQL, RLS, Supabase Storage privado, Zod, shadcn-vue/Reka UI (não React), Lucide, Vitest e Playwright quando disponíveis.

Verificar e utilizar os MCPs que estiverem instalados:

- **Context7**: documentação das versões instaladas.
- **Supabase MCP**: ler schema, migrations e RLS do projeto correto, conferindo projeto/ambiente.
- **shadcn/ui MCP**: referências visuais e padrões; para Nuxt usar implementação compatível com Vue.
- **Fetch MCP**: inspecionar o site e recursos de referência.

Não presumir que todas as ferramentas estejam conectadas. Relatar bloqueios, sem inventar resultados. Nenhuma operação destrutiva sem autorização. Nunca usar `service_role` no navegador.

**Tamanho dos arquivos**: máximo 200 linhas por arquivo de lógica; máximo 500 linhas para outros arquivos, exceto auditoria. Dividir módulos por responsabilidade antes de ultrapassar o limite. TypeScript bem tipado, sem `any` indiscriminado.

## 3. IDENTIDADE VISUAL REAL

Usar como referência `https://aportamovel.com.br/`. Paleta inspecionada:

- Vermelho principal `#D71A1B`.
- Vermelho de ação `#B91C1C`.
- Azul institucional `#09357A`.
- Branco `#FFFFFF`.
- Fundo leve `#F1F5F9`.
- Borda `#E2E8F0`.
- Texto secundário `#475569`.
- Fonte Inter, cantos aproximados de 12 px.

Consultar o logo no site de referência e utilizar o recurso institucional de maneira correta, com fallback, sem copiar recursos não necessários. Dashboard B2B elegante, profissional, responsivo e acessível. Sidebar, topbar, tabelas com filtros, estados vazios, toasts, skeletons, breadcrumbs e modais; priorizar uso em celulares por síndicos e porteiros. Não criar gradientes chamativos ou visual de painel genérico.

## 4. MODELO DE DADOS — RESPEITAR A BASE REAL

O pacote inicial já cria tabelas `management_companies`, `customers`, `management_assignments`, `user_profiles`, `staff_memberships`, `management_memberships`, `customer_memberships`, `service_contracts`, `contract_financials`, `tickets`, `ticket_status_history`, `ticket_messages`, `ticket_internal_notes`, `technical_visits`, `ticket_attachments` e `audit_events`.

**Primeiro conferir migrations existentes** e adaptar incrementalmente, sem criar um segundo modelo de clientes desconectado do importador.

### Gestão de clientes

- `customers` é a entidade cadastral canônica; `customer_kind` diferencia `condominium`, `business`, `person` ou `unclassified`.
- Clientes importados começam, por segurança, como `unclassified` até classificação revisada; nomes não são prova de que o cadastro seja condomínio.
- Manter `legacy_source` + `legacy_code`, com unicidade pela dupla, para conciliação e reimportação.
- CNPJ não é chave primária e não deve ser considerado único: preservar o identificador original; evitar duplicar por documento repetido.
- Campos originalmente ausentes, incompletos ou desconhecidos devem permanecer vazios/NULL em vez de receber valores inventados.
- Dados de síndico, zelador, CPF, RG, endereço pessoal e observações sensíveis devem ser avaliados por necessidade e LGPD; não migrar notas livres indiscriminadamente.

### Vínculos com administradoras

- `management_companies`: cadastro das administradoras.
- `management_assignments`: relacionamento com cliente/condomínio, com uma administradora ativa por cliente no modelo legado e histórico dos vínculos.
- `effective_from` do vínculo histórico deve ficar NULL quando a data original for desconhecida, não assumir que começou no dia da importação.
- O vínculo pode ser encerrado e substituído; preservar histórico; os dados existentes não devem ser reescritos silenciosamente por reexecução do importador.
- Cliente sem vínculo deve funcionar normalmente como independente, mas **ausência de código não prova independência comercial**: mostrar a necessidade de validação humana.
- Referências órfãs devem constar em relatório de reconciliação; não criar administradora falsa e não associar por nome parecido.

### Contratos

- Todo serviço/contrato pertence a um cliente/condomínio atendido.
- O contratante pode ser o cliente diretamente ou uma administradora; isso é independente do vínculo de administração do prédio.
- Dados financeiros devem ficar separados em `contract_financials`, protegidos de usuários sem autorização.
- Modelar contratos ativos, suspensos, encerrados e sem contrato.
- Incluir data de vigência, descrição, periodicidade e programação de visitas preventivas.

## 5. AUTENTICAÇÃO E AUTORIZAÇÃO

Usar Supabase Auth como identidade única de usuários, com login, logout, redefinição de senha, convite de primeiro acesso, proteção de sessão e retorno seguro de erro.

**Não criar usuários automaticamente com base no campo `Email` da tabela antiga.** Contatos cadastrados não são identidades autenticadas. A A Porta Móvel deve confirmar e convidar responsáveis autorizados.

Níveis de acesso:

1. **Proprietário**: controla tudo, inclusive vínculos, contas e configurações.
2. **Operações**: gerencia chamados e visitas, sem autoconceder privilégios de proprietário.
3. **Gestor de administradora**: acessa exclusivamente condomínios associados à sua administradora; abre e acompanha chamados.
4. **Atendente de administradora**: acesso operacional limitado, sem gerir papéis privilegiados.
5. **Síndico**: gerencia chamados e consulta contratos permitidos do seu condomínio.
6. **Porteiro/solicitante**: cria chamados e vê somente seus chamados autorizados, sem acesso financeiro ou a outros clientes.
7. **Responsável de condomínio independente**: funciona sem administradora.

Usuários podem ter múltiplos vínculos legítimos. Não implementar um único `role` sem escopo organizacional. Validar permissões sempre no banco e no servidor, nunca só pelo menu ou por IDs enviados no frontend. Revisar a política RLS das migrations, mantendo negação por padrão. Confirmar também o bloqueio após revogação de vínculo.

Bootstrap do primeiro proprietário deve ser administrativo, por script de desenvolvimento controlado ou CLI com credencial protegida. Não criar autoatribuição de `owner` no signup. Não permitir cadastro público indiscriminado nem uso do CNPJ para assumir um condomínio.

## 6. CONTAS FICTÍCIAS DE DEMONSTRAÇÃO

Criar as seguintes identidades **somente em um projeto Supabase de desenvolvimento/demonstração**, usando a API administrativa Auth em script seguro e senhas fornecidas por `.env` local não versionado:

| Nível | Login de demonstração | Variável local de senha |
|---|---|---|
| Proprietário | `dono@demo.example.com` | `DEMO_PASSWORD_OWNER` |
| Operações | `operacoes@demo.example.com` | `DEMO_PASSWORD_OPERATIONS` |
| Gestora Alfa | `gestora.alfa@demo.example.com` | `DEMO_PASSWORD_MANAGER_ALFA` |
| Gestora Beta | `gestora.beta@demo.example.com` | `DEMO_PASSWORD_MANAGER_BETA` |
| Atendente Alfa | `atendente.alfa@demo.example.com` | `DEMO_PASSWORD_ATTENDANT_ALFA` |
| Síndico | `sindico.jardins@demo.example.com` | `DEMO_PASSWORD_SYNDIC` |
| Porteiro | `porteiro.jardins@demo.example.com` | `DEMO_PASSWORD_PORTER` |
| Independente | `sindico.avulso@demo.example.com` | `DEMO_PASSWORD_INDEPENDENT` |

Usar senhas fortes, **diferentes para cada conta**, e informar ao usuário como defini-las e encontrá-las no seu `.env` local. O pacote inclui `migracao/demo_passwords.local.env` com valores APENAS DEMONSTRATIVOS; o arquivo deve permanecer fora do Git e jamais ser utilizado em produção. Nunca exibir ou versionar senhas reais de produção. O seed deve ser idempotente, exigir `DEMO_SEED_ENABLED=true`, recusar produção e não abrir o portal real com usuários demonstrativos. Somente declarar as contas disponíveis após autenticação de teste bem-sucedida.

Seed mínimo: 3 administradoras fictícias, 12 condomínios/empresas fictícias, 9 associados e 3 sem administradora, 8 contratos, 25 chamados, visitas, comentários e históricos. Dados precisam residir no PostgreSQL; jamais hardcode nos componentes. Usar nomes, documentos e contatos sintéticos, sem copiar clientes do backup.

## 7. TELAS E FLUXOS FUNCIONAIS

### Login

Layout institucional com logo, mensagem "Acompanhe seus chamados, serviços e manutenções em um só lugar", e-mail, senha, mostrar senha, recuperar senha, carregamento e tratamento de sessão. Desktop e mobile.

### Portal do cliente

Rotas sugestivas: `/portal`, `/portal/condominios`, `/portal/condominios/[id]`, `/portal/chamados`, `/portal/chamados/novo`, `/portal/chamados/[id]`, `/portal/contratos`, `/portal/agenda`, `/portal/perfil`.

Dashboard contextual: chamados abertos/em atendimento/concluídos, últimas atualizações, contratos permitidos, próximas visitas, seletor de condomínio para administradoras. O condomínio selecionado não é uma autorização; revalidar no servidor.

### Chamados

Abertura com condomínio, local, categoria, título, descrição, prioridade (`low`, `normal`, `high`, `emergency`), responsável e anexos privados. Categorias: portão travado, automatizador, manutenção preventiva, reparo, serralheria, repintura e outros.

Status: `open`, `review`, `scheduled`, `in_progress`, `waiting_customer`, `waiting_material`, `resolved`, `closed`, `cancelled`. Criar fluxo coerente com validações de transição, histórico de autor e data, comentários públicos e notas internas separadas. Não prometer tempo de resposta sem SLA contratual.

### Painel A Porta Móvel

Rotas sugestivas: `/admin`, `/admin/administradoras`, `/admin/clientes`, `/admin/condominios`, `/admin/vinculos`, `/admin/usuarios`, `/admin/chamados`, `/admin/contratos`, `/admin/agenda`, `/admin/auditoria`.

- Dashboard executivo com totais reais do banco.
- CRUD completo de clientes e administradoras.
- Filtro de `customer_kind`, inclusive `unclassified`, e revisão manual de classificação.
- Visualização de vínculos atuais e histórico, sem perda de rastreabilidade.
- Convites de usuários, associações a empresas e revogação.
- Gestão de chamados em tabela/Kanban, status, técnico, prioridade, mensagens e agendamento.
- Contratos e visitas preventivas, mantendo valores financeiros restritos.
- Página de **importação/conciliação** para mostrar contagens, casos órfãos, conflitos e registros sem classificação, sem expor dados pessoais em logs.

Campos cadastrais: razão social, fantasia, CNPJ quando houver, código legado, telefone/e-mail autorizados, endereço, responsável autorizado, tipo de cliente, situação e observações estritamente necessárias. `legacy_code` visível para busca e conciliação, mas chave de PK interna é UUID.

## 8. MIGRAÇÃO SEGURA: PROCESSO OBRIGATÓRIO

1. Confirmar que o `.bak` foi restaurado em SQL Server de **ambiente isolado**, sem sobrescrever base existente.
2. Executar o exportador do pacote em modo de inspeção. Por padrão, não carregar endereço/e-mail/telefone; essas informações requerem opção explícita.
3. Gerar `administradoras.csv`, `clientes.csv` e relatório de reconciliação fora do Git.
4. Validar IDs únicos, documentos com 14 dígitos apenas no campo CNPJ, contagem de vínculos, referências inexistentes, documentos repetidos e clientes que requerem classificação manual.
5. Executar `import_supabase.py` sem `--apply` para conferência e registrar métricas.
6. Aplicar as migrations na ordem indicada, em **projeto Supabase de desenvolvimento** autorizado.
7. Somente depois de confirmar projeto, backup e conteúdo, executar importação real mediante consentimento explícito do responsável.
8. Conferir contagens no PostgreSQL, amostras e resultados de RLS com diferentes perfis.
9. Reexecução deve ser idempotente. Não substituir clientes editados, não apagar vínculos e não decidir conflitos automaticamente.
10. Não enviar o arquivo `.bak`, CSVs nem dados pessoais para repositórios, sites externos ou conversas públicas.

O pacote disponibilizado neste projeto deve ser tratado como **fundação técnica**, não como prova de que o banco já foi importado. Se SQL Server/DB_URL/MCP estiverem indisponíveis, indicar o bloqueio e prosseguir com dados demonstrativos.

## 9. ARMAZENAMENTO, SEGURANÇA E LGPD

- Bucket privado para anexos de tickets; políticas `storage.objects` e URLs temporárias verificadas no servidor.
- A migração SQL inicial não configura essas policies: implementá-las antes de habilitar uploads reais.
- Notas internas ficam em tabela separada, nunca retornadas ao portal externo.
- Documentos financeiros ficam restritos, independentemente da visibilidade do contrato.
- Não indexar páginas privadas; impedir acesso pelo URL direto e por REST/SQL.
- Zod em formulários e endpoints; proteção contra uploads maliciosos e consultas indevidas.
- Auditoria de ações privilegiadas e mudanças de status.
- Verificar minimização de dados pessoais, políticas de retenção e necessidade da finalidade do tratamento.

## 10. QUALIDADE, TESTES E REGRAS DE ENTREGA

Criar testes unitários, integração e E2E, conforme ferramentas disponíveis:

- Login/logout/recuperação, convite, sessão expirada e usuário desativado.
- Acesso do proprietário, operações, gestora de administradora, atendente, síndico, porteiro e independente.
- Administradora Alfa não consulta Beta, nem pelo URL, nem por endpoint, nem pelo RLS.
- Porteiro não acessa outros chamados ou dados financeiros.
- Revogação de vínculo remove acesso imediatamente.
- Contatos importados não podem logar sem convite/autorização.
- Status de chamados mantém histórico; notas internas não vazam.
- Reexecução do seed e do importador não gera duplicatas.
- CNPJ duplicado não causa merge de entidades.
- Administradora inexistente no CSV gera relatório, sem relação inventada.
- Testar transações com rollback em erro, build, lint e tipagem.

Documentar como executar migrations, `migracao/`, `.env`, seed, perfis e testes. Separar tarefas implementadas, testadas, dependentes de credencial e não implementadas. Não chamar de "funcional" algo que não tenha sido executado ou validado.

### Sequência de trabalho

1. Inspecione repositório, dependências, migrations e MCPs. Não instale stack incompatível.
2. Revise os SQLs fornecidos; se encontrar falhas, corrija por novas migrations coerentes.
3. Crie UI, auth, fluxos, seed fictício e endpoints tipados.
4. Conclua cliente/admin/chamados/contratos/visitas com persistência real.
5. Execute testes de permissões e RLS com múltiplas identidades.
6. Valide exportação e importação **sem carregar dados reais até autorização expressa**.
7. Entregue relatório objetivo dos resultados e comandos de execução.

**Meta final:** portal profissional e funcional, com 8 contas de teste diferentes, vínculos corretos, dados fictícios para demonstração e caminho preparado para migração auditável do SQL Server legado ao Supabase. Continue autonomamente até o limite das ferramentas e credenciais disponíveis, sem esperar aprovação para decisões triviais e sem contornar exigências de segurança.
