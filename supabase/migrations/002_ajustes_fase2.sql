-- ============================================================================
-- SYNTR0PY · AJUSTES DE FASE 2
-- Decisiones aplicadas: D7 (nodo opcional) y D8 (consentimientos)
-- Motor: PostgreSQL 15+ (Supabase)
--
-- Esta migración se ejecuta DESPUÉS de 001_schema_inicial.sql.
-- No contiene credenciales.
-- ============================================================================

begin;

set search_path = public, extensions;

-- ----------------------------------------------------------------------------
-- 1. D8 · Consentimientos del perfil
-- ----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists age_confirmed_at timestamptz;

comment on column public.profiles.terms_accepted_at is
  'Fecha de aceptación de los términos de uso. Se copia desde los metadatos del registro.';

comment on column public.profiles.privacy_accepted_at is
  'Fecha de aceptación de la política de privacidad. Se copia desde los metadatos del registro.';

comment on column public.profiles.age_confirmed_at is
  'Fecha de confirmación de edad mínima (13+). No se guarda fecha de nacimiento.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_consents_all_or_none'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_consents_all_or_none check (
        (
          terms_accepted_at is null
          and privacy_accepted_at is null
          and age_confirmed_at is null
        )
        or
        (
          terms_accepted_at is not null
          and privacy_accepted_at is not null
          and age_confirmed_at is not null
        )
      );
  end if;
end;
$$;

-- El trigger conserva la generación de usuario único de 001 y agrega las
-- aceptaciones. Los metadatos del cliente no son prueba legal fuerte: son un
-- registro de la acción de aceptación hecha en la interfaz.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  base_username text;
  candidate citext;
  suffix integer := 0;
begin
  base_username := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'username'), ''),
    'usuario_' || substr(new.id::text, 1, 8)
  );

  base_username := regexp_replace(base_username, '[^A-Za-z0-9_]', '', 'g');

  if char_length(base_username) < 3 then
    base_username := 'usuario_' || substr(new.id::text, 1, 8);
  end if;

  base_username := left(base_username, 24);
  candidate := base_username;

  while exists (
    select 1 from public.profiles where username = candidate
  ) loop
    suffix := suffix + 1;
    candidate := left(base_username, 24) || suffix::text;

    if suffix > 9999 then
      candidate := 'usuario_' || substr(new.id::text, 1, 8);
      exit;
    end if;
  end loop;

  insert into public.profiles (
    id,
    username,
    full_name,
    timezone,
    locale,
    terms_accepted_at,
    privacy_accepted_at,
    age_confirmed_at
  )
  values (
    new.id,
    candidate,
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'timezone'), ''), 'UTC'),
    'es',
    case
      when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now()
      else null
    end,
    case
      when new.raw_user_meta_data ->> 'privacy_accepted' = 'true' then now()
      else null
    end,
    case
      when new.raw_user_meta_data ->> 'age_confirmed' = 'true' then now()
      else null
    end
  );

  insert into public.user_settings (user_id) values (new.id);
  insert into public.grading_settings (user_id) values (new.id);

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. D7 · El nodo de una fuente es opcional
-- ----------------------------------------------------------------------------

alter table public.sources
  alter column node_id drop not null;

comment on column public.sources.node_id is
  'Nodo de conocimiento opcional. NULL representa “Sin tema”; la asignatura sigue siendo obligatoria.';

-- ----------------------------------------------------------------------------
-- 3. Activación transaccional del año de curso
-- ----------------------------------------------------------------------------

create or replace function public.activate_academic_year(p_year_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  update public.academic_years
  set is_active = false
  where user_id = auth.uid()
    and id <> p_year_id
    and is_active = true;

  update public.academic_years
  set is_active = true
  where id = p_year_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Año de curso no encontrado' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.activate_academic_year(uuid) from public;
grant execute on function public.activate_academic_year(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. D8 · Eliminación de la propia cuenta
-- ----------------------------------------------------------------------------

create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  -- El borrado de auth.users dispara las cascadas de public.profiles y de
  -- todos los datos académicos. Los archivos de Storage requieren una
  -- limpieza adicional antes de publicar.
  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;

commit;
