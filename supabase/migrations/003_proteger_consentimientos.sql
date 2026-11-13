-- ============================================================================
-- SYNTR0PY · AJUSTES DE FASE 3
-- Protege las fechas de consentimiento del perfil (D8)
-- Motor: PostgreSQL 15+ (Supabase)
--
-- Esta migración se ejecuta DESPUÉS de 002_ajustes_fase2.sql.
-- No contiene credenciales. Se puede ejecutar más de una vez.
--
-- Problema que corrige:
--   La política `profiles_update_own` permite que cada usuario edite su propia
--   fila, y el rol `authenticated` tenía UPDATE sobre todas las columnas. Con
--   una llamada directa a la API, un usuario podía cambiar o borrar sus fechas
--   de aceptación de términos, privacidad y edad mínima.
--
-- Solución:
--   El rol del cliente solo conserva UPDATE sobre las columnas que la app
--   edita. Los consentimientos los escribe únicamente el trigger de alta
--   (`handle_new_user`, security definer), que no depende de estos permisos.
--
-- La Fase 3 no agrega tablas: tareas, exámenes y sesiones de estudio ya
-- existen desde 001_schema_inicial.sql.
-- ============================================================================

begin;

set search_path = public, extensions;

-- ----------------------------------------------------------------------------
-- 1. Permisos de edición del perfil por columna
-- ----------------------------------------------------------------------------

-- Quitar el permiso de tabla también quita los permisos por columna previos,
-- así que la migración deja siempre el mismo resultado.
revoke update on table public.profiles from authenticated, anon;

grant update (username, full_name, avatar_path, timezone, locale, onboarded_at)
  on table public.profiles
  to authenticated;

comment on column public.profiles.terms_accepted_at is
  'Fecha de aceptación de los términos de uso. Solo la escribe el trigger de alta; el cliente no puede modificarla.';

comment on column public.profiles.privacy_accepted_at is
  'Fecha de aceptación de la política de privacidad. Solo la escribe el trigger de alta; el cliente no puede modificarla.';

comment on column public.profiles.age_confirmed_at is
  'Fecha de confirmación de edad mínima (13+). No se guarda fecha de nacimiento. Solo la escribe el trigger de alta.';

-- ----------------------------------------------------------------------------
-- 2. Comprobación
-- ----------------------------------------------------------------------------
-- Si el permiso lo otorgó otro rol, el REVOKE anterior puede no tener efecto.
-- La migración falla y se revierte entera antes que dejar la protección a medias.

do $$
declare
  column_name text;
begin
  foreach column_name in array array[
    'id',
    'terms_accepted_at',
    'privacy_accepted_at',
    'age_confirmed_at',
    'created_at'
  ]
  loop
    if has_column_privilege('authenticated', 'public.profiles', column_name, 'UPDATE') then
      raise exception
        'profiles.% sigue siendo editable por el rol authenticated. Revisá quién otorgó el permiso.',
        column_name;
    end if;
  end loop;

  foreach column_name in array array[
    'username',
    'full_name',
    'avatar_path',
    'timezone',
    'locale',
    'onboarded_at'
  ]
  loop
    if not has_column_privilege('authenticated', 'public.profiles', column_name, 'UPDATE') then
      raise exception
        'profiles.% dejó de ser editable por el rol authenticated y la app la necesita.',
        column_name;
    end if;
  end loop;
end;
$$;

commit;
