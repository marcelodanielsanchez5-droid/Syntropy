-- ============================================================================
-- SYNTR0PY · ESQUEMA INICIAL
-- Fase 1 · Propuesta de diseño
-- Motor: PostgreSQL 15+ (Supabase)
--
-- IMPORTANTE:
--   - Esta migración NO ha sido ejecutada todavía en Supabase.
--   - Probar primero en un proyecto de desarrollo de Supabase.
--   - Requiere PostgreSQL 15 o superior por ON DELETE SET NULL (columna).
--   - No contiene credenciales.
--   - La decisión D7 (nodo opcional) y D8 (consentimientos) se aplican en
--     002_ajustes_fase2.sql. Ejecutar ambas migraciones en orden.
-- ============================================================================

begin;

-- El esquema extensions contiene citext. Se agrega al search_path para poder
-- usar el tipo sin calificarlo en todas las tablas y funciones.
set search_path = public, extensions;

-- ----------------------------------------------------------------------------
-- 1. Extensiones
-- ----------------------------------------------------------------------------

create extension if not exists citext with schema extensions;

-- gen_random_uuid() es parte de PostgreSQL 13+.
-- No se requiere pgcrypto para las claves primarias.

-- ----------------------------------------------------------------------------
-- 2. Tipos enumerados
-- ----------------------------------------------------------------------------

create type public.task_kind as enum ('task', 'project');
create type public.task_status as enum ('pending', 'waiting', 'done');
create type public.schedule_entry_type as enum ('class', 'break', 'activity', 'other');
create type public.study_session_status as enum ('scheduled', 'completed', 'skipped');
create type public.source_type as enum ('document', 'book', 'link', 'video', 'image', 'audio', 'other');
create type public.reminder_kind as enum ('task_due', 'exam', 'study_session', 'custom');
create type public.reminder_status as enum ('scheduled', 'sent', 'failed', 'cancelled');

-- ----------------------------------------------------------------------------
-- 3. Perfil y configuración
-- ----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext not null unique,
  full_name text,
  avatar_path text,
  timezone text not null default 'UTC'
    check (char_length(timezone) between 1 and 64),
  locale text not null default 'es'
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format
    check (username::text ~ '^[A-Za-z0-9_]{3,30}$')
);

comment on table public.profiles is
  'Perfil privado de cada usuario. Se crea automáticamente al confirmar el registro.';

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  week_starts_on smallint not null default 1
    check (week_starts_on = 1),
  theme text not null default 'dark'
    check (theme in ('dark', 'light', 'system')),
  email_reminders_enabled boolean not null default false,
  reminder_email citext,
  default_reminder_minutes integer not null default 1440
    check (default_reminder_minutes between 0 and 10080),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_settings is
  'Preferencias del usuario. La semana empieza siempre en lunes en el MVP.';

create table public.grading_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  scale_min numeric(6, 2) not null default 1,
  scale_max numeric(6, 2) not null default 10,
  passing_score numeric(6, 2) not null default 6,
  rounding_decimals smallint not null default 1
    check (rounding_decimals between 0 and 4),
  configured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grading_settings_scale_check
    check (scale_max > scale_min),
  constraint grading_settings_passing_check
    check (passing_score between scale_min and scale_max)
);

comment on table public.grading_settings is
  'Escala de calificaciones configurable. No se asume una escala 1-10: los valores son editables.';

-- ----------------------------------------------------------------------------
-- 4. Año de curso
-- ----------------------------------------------------------------------------

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null
    check (char_length(btrim(name)) between 1 and 80),
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_years_dates_check check (ends_on >= starts_on),
  constraint academic_years_id_user_key unique (id, user_id)
);

comment on table public.academic_years is
  'Ciclo académico del usuario. Puede representar un nivel, un año calendario o ambos.';

create unique index academic_years_one_active_per_user
  on public.academic_years (user_id)
  where is_active;

create index academic_years_user_idx
  on public.academic_years (user_id);

-- ----------------------------------------------------------------------------
-- 5. Asignaturas y horario
-- ----------------------------------------------------------------------------

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  academic_year_id uuid not null,
  name text not null
    check (char_length(btrim(name)) between 1 and 80),
  description text,
  color_hex text not null
    check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  teacher_names text[] not null default '{}'::text[]
    check (cardinality(teacher_names) <= 20),
  notes text,
  evaluation_criteria text,
  methodology text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_id_user_key unique (id, user_id),
  constraint subjects_year_user_fk
    foreign key (academic_year_id, user_id)
    references public.academic_years (id, user_id)
    on delete cascade
);

comment on table public.subjects is
  'Asignatura dentro de un año de curso. Los docentes se guardan como nombres en el MVP.';

create unique index subjects_unique_name_per_year
  on public.subjects (academic_year_id, lower(name));

create index subjects_user_year_idx
  on public.subjects (user_id, academic_year_id);

create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  academic_year_id uuid not null,
  subject_id uuid,
  title text not null
    check (char_length(btrim(title)) between 1 and 120),
  entry_type public.schedule_entry_type not null,
  weekday smallint not null
    check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_entries_time_check check (ends_at > starts_at),
  constraint schedule_entries_class_subject_check
    check (entry_type <> 'class' or subject_id is not null),
  constraint schedule_entries_year_user_fk
    foreign key (academic_year_id, user_id)
    references public.academic_years (id, user_id)
    on delete cascade,
  constraint schedule_entries_subject_user_fk
    foreign key (subject_id, user_id)
    references public.subjects (id, user_id)
    on delete cascade
);

comment on table public.schedule_entries is
  'Bloque semanal de horario. 1 = lunes ... 7 = domingo. Puede existir sin asignatura.';

create index schedule_entries_user_week_idx
  on public.schedule_entries (user_id, weekday, starts_at);

create index schedule_entries_subject_idx
  on public.schedule_entries (subject_id);

-- ----------------------------------------------------------------------------
-- 6. Nodos de conocimiento
-- ----------------------------------------------------------------------------

create table public.nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null,
  parent_id uuid,
  is_root boolean not null default false,
  name text not null
    check (char_length(btrim(name)) between 1 and 120),
  description text,
  summary text,
  difficulty smallint
    check (difficulty between 1 and 10),
  mastery smallint
    check (mastery between 1 and 10),
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nodes_id_user_key unique (id, user_id),
  constraint nodes_id_subject_user_key unique (id, subject_id, user_id),
  constraint nodes_subject_user_fk
    foreign key (subject_id, user_id)
    references public.subjects (id, user_id)
    on delete cascade,
  constraint nodes_parent_fk
    foreign key (parent_id, subject_id, user_id)
    references public.nodes (id, subject_id, user_id)
    on delete cascade,
  constraint nodes_root_check check (
    (is_root and parent_id is null and difficulty is null and mastery is null)
    or
    (not is_root and parent_id is not null and difficulty is not null and mastery is not null)
  ),
  constraint nodes_not_self_parent check (parent_id is null or parent_id <> id)
);

comment on table public.nodes is
  'Árbol de temas por asignatura. El nodo raíz es un contenedor; los temas tienen dificultad y dominio.';

create unique index nodes_one_root_per_subject
  on public.nodes (subject_id)
  where is_root;

create index nodes_subject_idx
  on public.nodes (subject_id);

create index nodes_parent_idx
  on public.nodes (parent_id);

create table public.node_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_node_id uuid not null,
  target_node_id uuid not null,
  label text,
  created_at timestamptz not null default now(),
  constraint node_links_distinct_nodes check (source_node_id <> target_node_id),
  constraint node_links_source_user_fk
    foreign key (source_node_id, user_id)
    references public.nodes (id, user_id)
    on delete cascade,
  constraint node_links_target_user_fk
    foreign key (target_node_id, user_id)
    references public.nodes (id, user_id)
    on delete cascade
);

comment on table public.node_links is
  'Conexiones transversales entre nodos, incluso de asignaturas distintas.';

create unique index node_links_unique_pair
  on public.node_links (
    least(source_node_id::text, target_node_id::text),
    greatest(source_node_id::text, target_node_id::text)
  );

create index node_links_source_idx
  on public.node_links (source_node_id);

create index node_links_target_idx
  on public.node_links (target_node_id);

-- ----------------------------------------------------------------------------
-- 7. Tareas
-- ----------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null,
  node_id uuid,
  title text not null
    check (char_length(btrim(title)) between 1 and 160),
  description text,
  kind public.task_kind not null default 'task',
  status public.task_status not null default 'pending',
  color_hex text
    check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  due_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_id_user_key unique (id, user_id),
  constraint tasks_id_subject_user_key unique (id, subject_id, user_id),
  constraint tasks_subject_user_fk
    foreign key (subject_id, user_id)
    references public.subjects (id, user_id)
    on delete cascade,
  constraint tasks_node_subject_user_fk
    foreign key (node_id, subject_id, user_id)
    references public.nodes (id, subject_id, user_id)
    on delete set null (node_id),
  constraint tasks_completed_check check (
    (status = 'done' and completed_at is not null)
    or
    (status <> 'done' and completed_at is null)
  )
);

comment on table public.tasks is
  'Tareas y proyectos. El color propio es opcional; en el calendario general manda el color de la asignatura.';

create index tasks_user_due_idx
  on public.tasks (user_id, due_at);

create index tasks_user_status_idx
  on public.tasks (user_id, status);

create index tasks_subject_due_idx
  on public.tasks (subject_id, due_at);

create index tasks_node_idx
  on public.tasks (node_id);

-- ----------------------------------------------------------------------------
-- 8. Exámenes y sesiones de estudio
-- ----------------------------------------------------------------------------

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null,
  node_id uuid,
  title text not null
    check (char_length(btrim(title)) between 1 and 160),
  description text,
  exam_at timestamptz not null,
  duration_minutes integer
    check (duration_minutes is null or duration_minutes between 1 and 1440),
  location text,
  study_days_before smallint
    check (study_days_before is null or study_days_before between 0 and 365),
  study_frequency_days smallint
    check (study_frequency_days is null or study_frequency_days between 1 and 30),
  study_session_minutes smallint
    check (study_session_minutes is null or study_session_minutes between 5 and 480),
  study_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exams_id_user_key unique (id, user_id),
  constraint exams_subject_user_fk
    foreign key (subject_id, user_id)
    references public.subjects (id, user_id)
    on delete cascade,
  constraint exams_node_subject_user_fk
    foreign key (node_id, subject_id, user_id)
    references public.nodes (id, subject_id, user_id)
    on delete set null (node_id),
  constraint exams_study_plan_check check (
    (
      study_days_before is null
      and study_frequency_days is null
      and study_session_minutes is null
      and study_time is null
    )
    or
    (
      study_days_before is not null
      and study_frequency_days is not null
      and study_session_minutes is not null
      and study_time is not null
    )
  )
);

comment on table public.exams is
  'Examen con fecha específica y plan de estudio opcional. Las sesiones se guardan en study_sessions.';

create index exams_user_date_idx
  on public.exams (user_id, exam_at);

create index exams_subject_date_idx
  on public.exams (subject_id, exam_at);

create index exams_node_idx
  on public.exams (node_id);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exam_id uuid not null,
  scheduled_at timestamptz not null,
  duration_minutes smallint not null
    check (duration_minutes between 5 and 480),
  status public.study_session_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_id_user_key unique (id, user_id),
  constraint study_sessions_exam_user_fk
    foreign key (exam_id, user_id)
    references public.exams (id, user_id)
    on delete cascade,
  constraint study_sessions_unique_slot unique (exam_id, scheduled_at)
);

comment on table public.study_sessions is
  'Sesiones generadas por el plan de estudio de un examen.';

create index study_sessions_user_date_idx
  on public.study_sessions (user_id, scheduled_at);

-- ----------------------------------------------------------------------------
-- 9. Calificaciones
-- ----------------------------------------------------------------------------

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null,
  node_id uuid,
  title text not null
    check (char_length(btrim(title)) between 1 and 160),
  score numeric(7, 2),
  scale_min numeric(6, 2) not null,
  scale_max numeric(6, 2) not null,
  weight numeric(7, 2) not null default 1
    check (weight > 0),
  assessed_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessments_id_user_key unique (id, user_id),
  constraint assessments_scale_check check (scale_max > scale_min),
  constraint assessments_score_check check (
    score is null or (score between scale_min and scale_max)
  ),
  constraint assessments_subject_user_fk
    foreign key (subject_id, user_id)
    references public.subjects (id, user_id)
    on delete cascade,
  constraint assessments_node_subject_user_fk
    foreign key (node_id, subject_id, user_id)
    references public.nodes (id, subject_id, user_id)
    on delete set null (node_id)
);

comment on table public.assessments is
  'Evaluaciones y notas. Cada fila conserva su escala para no reinterpretar notas históricas.';

create index assessments_subject_date_idx
  on public.assessments (subject_id, assessed_on);

create index assessments_node_idx
  on public.assessments (node_id);

-- ----------------------------------------------------------------------------
-- 10. Biblioteca
-- ----------------------------------------------------------------------------

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null,
  node_id uuid not null,
  task_id uuid,
  title text not null
    check (char_length(btrim(title)) between 1 and 200),
  description text,
  source_type public.source_type not null,
  external_url text,
  storage_path text,
  thumbnail_path text,
  tags text[] not null default '{}'::text[]
    check (cardinality(tags) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_id_user_key unique (id, user_id),
  constraint sources_location_check check (
    external_url is not null or storage_path is not null
  ),
  constraint sources_subject_user_fk
    foreign key (subject_id, user_id)
    references public.subjects (id, user_id)
    on delete cascade,
  constraint sources_node_subject_user_fk
    foreign key (node_id, subject_id, user_id)
    references public.nodes (id, subject_id, user_id)
    on delete no action deferrable initially deferred,
  constraint sources_task_subject_user_fk
    foreign key (task_id, subject_id, user_id)
    references public.tasks (id, subject_id, user_id)
    on delete set null (task_id)
);

comment on table public.sources is
  'Fuentes académicas de la biblioteca. El nodo se vuelve opcional en 002 (decisión D7).';

create index sources_user_subject_idx
  on public.sources (user_id, subject_id);

create index sources_node_idx
  on public.sources (node_id);

create index sources_task_idx
  on public.sources (task_id);

create index sources_tags_gin
  on public.sources using gin (tags);

-- ----------------------------------------------------------------------------
-- 11. Recordatorios
-- ----------------------------------------------------------------------------

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.reminder_kind not null,
  task_id uuid,
  exam_id uuid,
  study_session_id uuid,
  send_at timestamptz not null,
  recipient citext not null,
  subject text not null
    check (char_length(btrim(subject)) between 1 and 200),
  body text,
  status public.reminder_status not null default 'scheduled',
  provider_message_id text,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_relation_check check (
    (kind = 'task_due' and task_id is not null and exam_id is null and study_session_id is null)
    or
    (kind = 'exam' and task_id is null and exam_id is not null and study_session_id is null)
    or
    (kind = 'study_session' and task_id is null and exam_id is null and study_session_id is not null)
    or
    (kind = 'custom' and task_id is null and exam_id is null and study_session_id is null)
  ),
  constraint reminders_task_user_fk
    foreign key (task_id, user_id)
    references public.tasks (id, user_id)
    on delete cascade,
  constraint reminders_exam_user_fk
    foreign key (exam_id, user_id)
    references public.exams (id, user_id)
    on delete cascade,
  constraint reminders_session_user_fk
    foreign key (study_session_id, user_id)
    references public.study_sessions (id, user_id)
    on delete cascade
);

comment on table public.reminders is
  'Recordatorios de correo. Fase 7. Se procesan desde una Edge Function con service_role.';

create index reminders_pending_idx
  on public.reminders (status, send_at);

create index reminders_task_idx
  on public.reminders (task_id);

create index reminders_exam_idx
  on public.reminders (exam_id);

create index reminders_session_idx
  on public.reminders (study_session_id);

-- ----------------------------------------------------------------------------
-- 12. Trigger de updated_at
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'user_settings',
    'grading_settings',
    'academic_years',
    'subjects',
    'schedule_entries',
    'nodes',
    'tasks',
    'exams',
    'study_sessions',
    'assessments',
    'sources',
    'reminders'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 13. Trigger de registro
-- ----------------------------------------------------------------------------

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

  insert into public.profiles (id, username, full_name, timezone, locale)
  values (
    new.id,
    candidate,
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'timezone'), ''), 'UTC'),
    'es'
  );

  insert into public.user_settings (user_id) values (new.id);
  insert into public.grading_settings (user_id) values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 14. RLS
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.grading_settings enable row level security;
alter table public.academic_years enable row level security;
alter table public.subjects enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.nodes enable row level security;
alter table public.node_links enable row level security;
alter table public.tasks enable row level security;
alter table public.exams enable row level security;
alter table public.study_sessions enable row level security;
alter table public.assessments enable row level security;
alter table public.sources enable row level security;
alter table public.reminders enable row level security;

-- Perfil: solo lectura y edición del propio perfil.
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Configuración del usuario.
create policy user_settings_own
  on public.user_settings for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy grading_settings_own
  on public.grading_settings for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Tablas con user_id propio.
create policy academic_years_own
  on public.academic_years for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy subjects_own
  on public.subjects for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy schedule_entries_own
  on public.schedule_entries for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy nodes_own
  on public.nodes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy node_links_own
  on public.node_links for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy tasks_own
  on public.tasks for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy exams_own
  on public.exams for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy study_sessions_own
  on public.study_sessions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy assessments_own
  on public.assessments for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy sources_own
  on public.sources for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy reminders_own
  on public.reminders for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 15. Permisos
-- ----------------------------------------------------------------------------
-- Supabase ya otorga permisos por defecto a authenticated; se declaran de forma
-- explícita para que la migración sea reproducible. RLS sigue siendo la capa
-- que decide qué filas puede ver cada usuario.

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.user_settings,
  public.grading_settings,
  public.academic_years,
  public.subjects,
  public.schedule_entries,
  public.nodes,
  public.node_links,
  public.tasks,
  public.exams,
  public.study_sessions,
  public.assessments,
  public.sources,
  public.reminders
to authenticated;

-- ----------------------------------------------------------------------------
-- 16. Storage
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'academic-files',
    'academic-files',
    false,
    26214400,
    array[
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
      'video/mp4',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
  ),
  (
    'avatars',
    'avatars',
    false,
    2097152,
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do nothing;

-- Archivos académicos: el primer segmento de la ruta debe ser el user_id.
create policy academic_files_select_own
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'academic-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy academic_files_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'academic-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy academic_files_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'academic-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'academic-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy academic_files_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'academic-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatares.
create policy avatars_select_own
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
--
-- Próximos pasos antes de usarla:
--   1. Ejecutar en un proyecto de desarrollo.
--   2. Verificar tablas, enums, índices y triggers.
--   3. Crear dos usuarios y probar aislamiento con RLS.
--   4. Probar borrados en cascada y restricciones.
--   5. Probar Storage con archivos de ambos usuarios.
-- ============================================================================
