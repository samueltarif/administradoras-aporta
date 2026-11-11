-- Personalizações em schemas gerenciados pelo Supabase (auth, storage), capturadas em 05/11/2026.
-- O `supabase db dump` padrão NÃO inclui auth/storage; recriar isto após restaurar em projeto novo.
-- Única personalização existente (do portal; o site não tem nenhuma). Policies em auth/storage: 0.
-- Depende de public.create_auth_profile() (migration 02).
create trigger on_portamovel_auth_user_created after insert on auth.users
  for each row execute function public.create_auth_profile();
