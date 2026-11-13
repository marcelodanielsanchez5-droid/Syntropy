-- ============================================================================
-- SYNTR0PY · FASE 8 · VERSIONES DE LOS TEXTOS LEGALES
-- Qué versión de los términos y de la política de privacidad aceptó cada
-- usuario, y aceptación de versiones nuevas
-- Motor: PostgreSQL 15+ (Supabase)
--
-- Esta migración se ejecuta DESPUÉS de 005_recordatorios.sql.
-- No contiene credenciales. Se puede ejecutar más de una vez.
--
-- Cómo funciona:
--   - `public.current_legal_versions()` es la versión vigente de cada texto.
--     Tiene que coincidir con LEGAL_VERSIONS en
--     src/features/legal/legal-documents.ts.
--   - Al registrarse, el cliente manda las versiones que mostró; un disparador
--     las guarda solo si son las vigentes.
--   - Si cambia una versión, la app pide aceptar de nuevo y llama a
--     `accept_legal_documents()`, que valida la versión y guarda la fecha.
--   - El cliente sigue sin poder escribir directamente los consentimientos.
-- ============================================================================

begin;

set search_path = public, extensions;

-- ----------------------------------------------------------------------------
-- 1. Versión aceptada
-- ----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists terms_version text,
  add column if not exists privacy_version text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_legal_versions_length' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_legal_versions_length check (
        (terms_version is null or char_length(terms_version) <= 40)
        and (privacy_version is null or char_length(privacy_version) <= 40)
      );
  end if;
end;
$$;

comment on column public.profiles.terms_version is
  'Versión de los términos de uso aceptada en terms_accepted_at. Solo la escriben el alta y accept_legal_documents().';

comment on column public.profiles.privacy_version is
  'Versión de la política de privacidad aceptada en privacy_accepted_at. Solo la escriben el alta y accept_legal_documents().';

-- Quienes aceptaron antes de esta migración aceptaron el borrador del
-- 10/11/2026: se registra así, y la app les pide aceptar la versión vigente.
update public.profiles
   set terms_version = 'borrador-2026-11-10'
 where terms_accepted_at is not null and terms_version is null;

update public.profiles
   set privacy_version = 'borrador-2026-11-10'
 where privacy_accepted_at is not null and privacy_version is null;

-- ----------------------------------------------------------------------------
-- 2. Versión vigente
-- ----------------------------------------------------------------------------

create or replace function public.current_legal_versions(
  out terms_version text,
  out privacy_version text
)
language sql
immutable
set search_path = public
as $$
  select '2026-11-13'::text, '2026-11-13'::text
$$;

comment on function public.current_legal_versions() is
  'Versiones vigentes de los términos y de la política de privacidad. Igual que LEGAL_VERSIONS en la app.';

-- ----------------------------------------------------------------------------
-- 3. Alta: guardar la versión que vio el usuario
-- ----------------------------------------------------------------------------
-- No se reemplaza handle_new_user (002): un disparador sobre profiles lee los
-- metadatos del registro y guarda la versión solo si es la vigente. Si el
-- cliente mandó otra (por ejemplo, una pestaña vieja), queda nula y la app
-- pide aceptar al ingresar.

create or replace function public.profiles_set_legal_versions()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  metadata jsonb;
  current_versions record;
begin
  select raw_user_meta_data into metadata from auth.users where id = new.id;
  select * into current_versions from public.current_legal_versions();

  new.terms_version := case
    when new.terms_accepted_at is not null
         and metadata ->> 'terms_version' = current_versions.terms_version
      then current_versions.terms_version
  end;

  new.privacy_version := case
    when new.privacy_accepted_at is not null
         and metadata ->> 'privacy_version' = current_versions.privacy_version
      then current_versions.privacy_version
  end;

  return new;
end;
$$;

drop trigger if exists profiles_set_legal_versions on public.profiles;

create trigger profiles_set_legal_versions
  before insert on public.profiles
  for each row execute function public.profiles_set_legal_versions();

-- ----------------------------------------------------------------------------
-- 4. Aceptar una versión nueva
-- ----------------------------------------------------------------------------
-- Códigos propios: SY007 la versión no es la vigente; SY008 falta confirmar
-- la edad mínima.

create or replace function public.accept_legal_documents(
  p_terms_version text,
  p_privacy_version text,
  p_age_confirmed boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_versions record;
  age_confirmed timestamptz;
begin
  if current_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select * into current_versions from public.current_legal_versions();

  if p_terms_version is distinct from current_versions.terms_version
     or p_privacy_version is distinct from current_versions.privacy_version then
    raise exception 'Los textos cambiaron mientras los leías. Recargá la página para ver la versión vigente.'
      using errcode = 'SY007';
  end if;

  select age_confirmed_at into age_confirmed
    from public.profiles
   where id = current_user_id
   for update;

  if not found then
    raise exception 'No encontramos tu perfil.' using errcode = 'SY007';
  end if;

  if age_confirmed is null and not coalesce(p_age_confirmed, false) then
    raise exception 'Confirmá que tenés 13 años o más.' using errcode = 'SY008';
  end if;

  update public.profiles
     set terms_accepted_at = now(),
         privacy_accepted_at = now(),
         age_confirmed_at = coalesce(age_confirmed_at, now()),
         terms_version = current_versions.terms_version,
         privacy_version = current_versions.privacy_version
   where id = current_user_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Permisos
-- ----------------------------------------------------------------------------
-- Las columnas nuevas no se agregan al GRANT UPDATE por columna de la 003: el
-- cliente no puede escribirlas.

revoke all on function public.profiles_set_legal_versions() from public, anon, authenticated;

revoke all on function public.accept_legal_documents(text, text, boolean) from public, anon;
grant execute on function public.accept_legal_documents(text, text, boolean) to authenticated;

grant execute on function public.current_legal_versions() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. Comprobación
-- ----------------------------------------------------------------------------

do $$
declare
  column_name text;
begin
  foreach column_name in array array[
    'terms_version', 'privacy_version', 'terms_accepted_at', 'privacy_accepted_at', 'age_confirmed_at'
  ]
  loop
    if has_column_privilege('authenticated', 'public.profiles', column_name, 'UPDATE') then
      raise exception 'profiles.% es editable por el rol authenticated.', column_name;
    end if;
  end loop;

  if not has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE') then
    raise exception 'profiles.full_name dejó de ser editable y la app la necesita.';
  end if;

  if has_function_privilege('anon', 'public.accept_legal_documents(text, text, boolean)', 'EXECUTE') then
    raise exception 'anon puede aceptar documentos legales.';
  end if;

  if not has_function_privilege('authenticated', 'public.accept_legal_documents(text, text, boolean)', 'EXECUTE') then
    raise exception 'El cliente no puede aceptar los documentos legales.';
  end if;
end;
$$;

commit;
