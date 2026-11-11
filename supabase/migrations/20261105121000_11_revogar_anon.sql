-- 11: defesa em profundidade. O portal nunca consulta dados sem login: o papel anon perde
-- os privilégios padrão do Supabase nas tabelas, sequências e funções do schema public
-- (a RLS já negava; agora nem a permissão de tabela existe). Projeto exclusivo do portal.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;
