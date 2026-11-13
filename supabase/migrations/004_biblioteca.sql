-- ============================================================================
-- SYNTR0PY · FASE 6 · BIBLIOTECA DE FUENTES
-- Tamaño y tipo de cada archivo, y límite de espacio por usuario
-- Motor: PostgreSQL 15+ (Supabase)
--
-- Esta migración se ejecuta DESPUÉS de 003_proteger_consentimientos.sql.
-- No contiene credenciales. Se puede ejecutar más de una vez.
--
-- El modelo de datos dejó para esta fase el máximo de fuentes por usuario
-- (sección 10). Aprobado por el usuario el 13/11/2026 (decisión D27):
--   - 25 MB por archivo (ya lo impone el bucket `academic-files`);
--   - 200 MB de archivos por usuario;
--   - 1000 fuentes por usuario.
-- Los dos últimos valores están en `public.library_limits()`: para cambiarlos
-- basta con reemplazar esa función.
-- ============================================================================

begin;

set search_path = public, extensions;

-- ----------------------------------------------------------------------------
-- 1. Tamaño y tipo del archivo
-- ----------------------------------------------------------------------------

alter table public.sources
  add column if not exists size_bytes bigint,
  add column if not exists mime_type text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sources_size_bytes_check' and conrelid = 'public.sources'::regclass
  ) then
    alter table public.sources
      add constraint sources_size_bytes_check check (size_bytes is null or size_bytes >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sources_mime_type_check' and conrelid = 'public.sources'::regclass
  ) then
    alter table public.sources
      add constraint sources_mime_type_check check (mime_type is null or char_length(mime_type) <= 127);
  end if;
end;
$$;

comment on column public.sources.size_bytes is
  'Tamaño del archivo en Storage, en bytes. Nulo en los enlaces. Cuenta para el límite por usuario.';

comment on column public.sources.mime_type is
  'Tipo MIME del archivo subido. Nulo en los enlaces.';

-- ----------------------------------------------------------------------------
-- 2. Límites por usuario
-- ----------------------------------------------------------------------------

create or replace function public.library_limits(
  out max_bytes bigint,
  out max_sources integer
)
language sql
immutable
set search_path = public
as $$
  select 209715200::bigint, 1000
$$;

comment on function public.library_limits() is
  'Límites de la biblioteca por usuario: 200 MB de archivos y 1000 fuentes.';

create or replace function public.enforce_library_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limits record;
  used_bytes bigint;
  used_sources integer;
begin
  select * into limits from public.library_limits();

  select coalesce(sum(size_bytes), 0), count(*)
    into used_bytes, used_sources
    from public.sources
   where user_id = new.user_id
     and id <> new.id;

  if tg_op = 'INSERT' and used_sources + 1 > limits.max_sources then
    raise exception 'Llegaste al máximo de % fuentes en la biblioteca.', limits.max_sources
      using errcode = 'SY002';
  end if;

  if used_bytes + coalesce(new.size_bytes, 0) > limits.max_bytes then
    raise exception 'Superaste el espacio de la biblioteca.'
      using errcode = 'SY001',
            detail = format('usado=%s nuevo=%s limite=%s', used_bytes, coalesce(new.size_bytes, 0), limits.max_bytes);
  end if;

  return new;
end;
$$;

drop trigger if exists sources_enforce_library_limits on public.sources;

create trigger sources_enforce_library_limits
  before insert or update of size_bytes on public.sources
  for each row execute function public.enforce_library_limits();

-- El cliente puede consultar los límites para mostrarlos.
grant execute on function public.library_limits() to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Qué puede editar el cliente de una fuente
-- ----------------------------------------------------------------------------
-- El archivo, su tamaño, su tipo y la miniatura se fijan al crearla. Así el
-- tamaño declarado no se puede bajar después para esquivar el límite.

revoke update on table public.sources from authenticated, anon;

grant update (subject_id, node_id, task_id, title, description, source_type, external_url, tags)
  on table public.sources
  to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Comprobación
-- ----------------------------------------------------------------------------

do $$
declare
  column_name text;
begin
  foreach column_name in array array['storage_path', 'thumbnail_path', 'size_bytes', 'mime_type', 'user_id']
  loop
    if has_column_privilege('authenticated', 'public.sources', column_name, 'UPDATE') then
      raise exception 'sources.% sigue siendo editable por el rol authenticated.', column_name;
    end if;
  end loop;

  foreach column_name in array array['title', 'node_id', 'task_id', 'tags', 'subject_id']
  loop
    if not has_column_privilege('authenticated', 'public.sources', column_name, 'UPDATE') then
      raise exception 'sources.% dejó de ser editable por el rol authenticated y la app la necesita.', column_name;
    end if;
  end loop;
end;
$$;

commit;
