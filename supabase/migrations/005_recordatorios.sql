-- ============================================================================
-- SYNTR0PY · FASE 7 · RECORDATORIOS POR CORREO
-- Programación automática de recordatorios y funciones para enviarlos
-- Motor: PostgreSQL 15+ (Supabase)
--
-- Esta migración se ejecuta DESPUÉS de 004_biblioteca.sql.
-- No contiene credenciales. Se puede ejecutar más de una vez.
--
-- Cómo funciona:
--   1. La base programa sola un recordatorio por tarea, examen y sesión de
--      estudio, según las preferencias de `user_settings`. Si cambia la fecha
--      del evento o las preferencias, el recordatorio se recalcula.
--   2. La Edge Function `send-reminders` reclama los que vencieron con
--      `claim_due_reminders()`, los envía con Resend y guarda el resultado con
--      `finish_reminder()`. Solo `service_role` puede llamar a esas dos.
--   3. El cliente solo lee sus recordatorios y los cancela, reactiva o
--      reprograma con funciones que validan cada cambio.
--
-- La ejecución cada 5 minutos (pg_cron + pg_net) NO está acá: necesita la URL
-- del proyecto y un secreto. Ver supabase/setup/programar-recordatorios.sql.
-- ============================================================================

begin;

set search_path = public, extensions;

-- ----------------------------------------------------------------------------
-- 1. Preferencias por tipo de recordatorio
-- ----------------------------------------------------------------------------

alter table public.user_settings
  add column if not exists remind_tasks boolean not null default true,
  add column if not exists remind_exams boolean not null default true,
  add column if not exists remind_study_sessions boolean not null default false;

comment on column public.user_settings.remind_tasks is
  'Avisar por correo antes del vencimiento de cada tarea pendiente.';

comment on column public.user_settings.remind_exams is
  'Avisar por correo antes de cada examen.';

comment on column public.user_settings.remind_study_sessions is
  'Avisar por correo antes de cada sesión de estudio. Apagado por defecto: suelen ser muchas.';

-- ----------------------------------------------------------------------------
-- 2. Control de envío
-- ----------------------------------------------------------------------------

alter table public.reminders
  add column if not exists event_at timestamptz,
  add column if not exists attempts smallint not null default 0,
  add column if not exists locked_until timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reminders_attempts_check' and conrelid = 'public.reminders'::regclass
  ) then
    alter table public.reminders
      add constraint reminders_attempts_check check (attempts between 0 and 20);
  end if;
end;
$$;

comment on column public.reminders.event_at is
  'Momento del evento que se recuerda (vencimiento, examen o sesión). Nulo en los personalizados.';

comment on column public.reminders.attempts is
  'Intentos de envío. Después de 3 fallos temporales el recordatorio queda como fallido.';

comment on column public.reminders.locked_until is
  'Mientras la Edge Function lo está enviando, nadie más lo reclama hasta esta hora.';

-- Un solo recordatorio abierto (programado o cancelado) por evento. Los
-- enviados y fallidos quedan como historial.
create unique index if not exists reminders_open_task_key
  on public.reminders (task_id)
  where kind = 'task_due' and status in ('scheduled', 'cancelled');

create unique index if not exists reminders_open_exam_key
  on public.reminders (exam_id)
  where kind = 'exam' and status in ('scheduled', 'cancelled');

create unique index if not exists reminders_open_session_key
  on public.reminders (study_session_id)
  where kind = 'study_session' and status in ('scheduled', 'cancelled');

create index if not exists reminders_user_send_idx
  on public.reminders (user_id, send_at);

-- ----------------------------------------------------------------------------
-- 3. Funciones auxiliares (solo para uso interno)
-- ----------------------------------------------------------------------------

-- Dirección de destino: la de user_settings si existe; si no, la de Auth (que
-- ya está verificada). El cliente no puede cambiar `reminder_email` (sección 7)
-- para que nadie use Syntropy para mandar correos a direcciones ajenas.
create or replace function public.reminder_recipient(p_user_id uuid)
returns citext
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(s.reminder_email, nullif(btrim(u.email::text), '')::citext)
    from auth.users u
    left join public.user_settings s on s.user_id = u.id
   where u.id = p_user_id
$$;

-- Indica si el usuario quiere recibir este tipo de recordatorio.
create or replace function public.reminder_wanted(p_user_id uuid, p_kind public.reminder_kind)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select s.email_reminders_enabled and case p_kind
      when 'task_due' then s.remind_tasks
      when 'exam' then s.remind_exams
      when 'study_session' then s.remind_study_sessions
      else true
    end
      from public.user_settings s
     where s.user_id = p_user_id
  ), false)
$$;

-- Texto provisional del asunto. La Edge Function lo reemplaza al enviar por uno
-- con la fecha en la zona horaria del usuario.
create or replace function public.reminder_label(p_kind public.reminder_kind, p_title text)
returns text
language sql
immutable
set search_path = public
as $$
  select left(
    case p_kind
      when 'task_due' then 'Tarea: '
      when 'exam' then 'Examen: '
      when 'study_session' then 'Sesión de estudio: '
      else ''
    end || coalesce(nullif(btrim(p_title), ''), 'sin título'),
    200
  )
$$;

-- Crea, actualiza o borra el recordatorio de un evento.
--   p_active    el evento sigue vigente (tarea sin terminar, sesión programada).
--   p_recompute recalcular la hora aunque el evento no se haya movido (cuando
--               cambia la anticipación en las preferencias).
-- Reglas:
--   - Lo que programó la base se borra si deja de corresponder; lo que el
--     usuario canceló se conserva cancelado.
--   - Si la hora de aviso ya pasó, no se programa (no se manda un aviso tarde).
--   - No se repite el aviso de un evento que ya se envió para la misma fecha.
create or replace function public.sync_reminder(
  p_user_id uuid,
  p_kind public.reminder_kind,
  p_entity_id uuid,
  p_event_at timestamptz,
  p_active boolean,
  p_title text,
  p_recompute boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  lead_minutes integer;
  next_send_at timestamptz;
  open_reminder public.reminders%rowtype;
  has_open boolean;
  recipient_address citext;
begin
  if p_kind = 'custom' then
    raise exception 'Los recordatorios personalizados no se sincronizan con un evento.';
  end if;

  select default_reminder_minutes into lead_minutes
    from public.user_settings
   where user_id = p_user_id;

  next_send_at := p_event_at - make_interval(mins => coalesce(lead_minutes, 1440));

  select * into open_reminder
    from public.reminders r
   where r.user_id = p_user_id
     and r.kind = p_kind
     and r.status in ('scheduled', 'cancelled')
     and (
       (p_kind = 'task_due' and r.task_id = p_entity_id)
       or (p_kind = 'exam' and r.exam_id = p_entity_id)
       or (p_kind = 'study_session' and r.study_session_id = p_entity_id)
     )
   for update;

  has_open := found;

  if not (p_active and public.reminder_wanted(p_user_id, p_kind)) then
    if has_open and open_reminder.status = 'scheduled' then
      delete from public.reminders where id = open_reminder.id;
    end if;
    return;
  end if;

  recipient_address := public.reminder_recipient(p_user_id);

  if has_open then
    -- Se conserva una hora elegida a mano mientras el evento no se mueva.
    if not p_recompute and open_reminder.event_at is not distinct from p_event_at then
      next_send_at := open_reminder.send_at;
    end if;

    if open_reminder.status = 'scheduled' and next_send_at <= now() then
      delete from public.reminders where id = open_reminder.id;
      return;
    end if;

    update public.reminders
       set event_at = p_event_at,
           send_at = next_send_at,
           recipient = coalesce(recipient_address, recipient),
           subject = public.reminder_label(p_kind, p_title),
           attempts = case when send_at = next_send_at then attempts else 0 end,
           error_message = case when send_at = next_send_at then error_message else null end
     where id = open_reminder.id;
    return;
  end if;

  if next_send_at <= now() or recipient_address is null then
    return;
  end if;

  if exists (
    select 1
      from public.reminders r
     where r.user_id = p_user_id
       and r.kind = p_kind
       and r.status in ('sent', 'failed')
       and r.event_at = p_event_at
       and (
         (p_kind = 'task_due' and r.task_id = p_entity_id)
         or (p_kind = 'exam' and r.exam_id = p_entity_id)
         or (p_kind = 'study_session' and r.study_session_id = p_entity_id)
       )
  ) then
    return;
  end if;

  begin
    insert into public.reminders (
      user_id, kind, task_id, exam_id, study_session_id,
      send_at, event_at, recipient, subject
    )
    values (
      p_user_id,
      p_kind,
      case when p_kind = 'task_due' then p_entity_id end,
      case when p_kind = 'exam' then p_entity_id end,
      case when p_kind = 'study_session' then p_entity_id end,
      next_send_at,
      p_event_at,
      recipient_address,
      public.reminder_label(p_kind, p_title)
    );
  exception
    when unique_violation then
      -- Otra transacción lo creó al mismo tiempo: alcanza con uno.
      null;
  end;
end;
$$;

-- Vuelve a calcular todos los recordatorios futuros de un usuario. Se usa
-- cuando cambian sus preferencias. `p_recompute` solo cuando cambió la
-- anticipación: activar o apagar un tipo no pisa las horas elegidas a mano.
create or replace function public.resync_user_reminders(p_user_id uuid, p_recompute boolean default false)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  item record;
begin
  for item in
    select id, due_at, status, title
      from public.tasks
     where user_id = p_user_id and due_at > now()
  loop
    perform public.sync_reminder(
      p_user_id, 'task_due', item.id, item.due_at, item.status <> 'done', item.title, p_recompute
    );
  end loop;

  for item in
    select id, exam_at, title
      from public.exams
     where user_id = p_user_id and exam_at > now()
  loop
    perform public.sync_reminder(p_user_id, 'exam', item.id, item.exam_at, true, item.title, p_recompute);
  end loop;

  for item in
    select s.id, s.scheduled_at, s.status, e.title
      from public.study_sessions s
      join public.exams e on e.id = s.exam_id
     where s.user_id = p_user_id and s.scheduled_at > now()
  loop
    perform public.sync_reminder(
      p_user_id, 'study_session', item.id, item.scheduled_at, item.status = 'scheduled', item.title, p_recompute
    );
  end loop;

  -- Correos de prueba pendientes si se apagaron los recordatorios.
  if not public.reminder_wanted(p_user_id, 'custom') then
    delete from public.reminders
     where user_id = p_user_id and kind = 'custom' and status = 'scheduled';
  end if;

  -- Si cambió la dirección, los pendientes van a la nueva.
  update public.reminders
     set recipient = public.reminder_recipient(p_user_id)
   where user_id = p_user_id
     and status in ('scheduled', 'cancelled')
     and public.reminder_recipient(p_user_id) is not null
     and recipient is distinct from public.reminder_recipient(p_user_id);
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Disparadores
-- ----------------------------------------------------------------------------

create or replace function public.tasks_sync_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_reminder(
    new.user_id, 'task_due', new.id, new.due_at, new.status <> 'done', new.title
  );
  return null;
end;
$$;

drop trigger if exists tasks_sync_reminder on public.tasks;

create trigger tasks_sync_reminder
  after insert or update of due_at, status, title on public.tasks
  for each row execute function public.tasks_sync_reminder();

create or replace function public.exams_sync_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_reminder(new.user_id, 'exam', new.id, new.exam_at, true, new.title);

  -- El asunto de las sesiones lleva el nombre del examen.
  if tg_op = 'UPDATE' and new.title is distinct from old.title then
    update public.reminders r
       set subject = public.reminder_label('study_session', new.title)
      from public.study_sessions s
     where s.exam_id = new.id
       and r.study_session_id = s.id
       and r.status in ('scheduled', 'cancelled');
  end if;

  return null;
end;
$$;

drop trigger if exists exams_sync_reminder on public.exams;

create trigger exams_sync_reminder
  after insert or update of exam_at, title on public.exams
  for each row execute function public.exams_sync_reminder();

create or replace function public.study_sessions_sync_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  exam_title text;
begin
  select title into exam_title from public.exams where id = new.exam_id;

  perform public.sync_reminder(
    new.user_id, 'study_session', new.id, new.scheduled_at, new.status = 'scheduled', exam_title
  );
  return null;
end;
$$;

drop trigger if exists study_sessions_sync_reminder on public.study_sessions;

create trigger study_sessions_sync_reminder
  after insert or update of scheduled_at, status on public.study_sessions
  for each row execute function public.study_sessions_sync_reminder();

create or replace function public.user_settings_sync_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.resync_user_reminders(
    new.user_id,
    new.default_reminder_minutes is distinct from old.default_reminder_minutes
  );
  return null;
end;
$$;

drop trigger if exists user_settings_sync_reminders on public.user_settings;

create trigger user_settings_sync_reminders
  after update of email_reminders_enabled, reminder_email, default_reminder_minutes,
    remind_tasks, remind_exams, remind_study_sessions
  on public.user_settings
  for each row execute function public.user_settings_sync_reminders();

-- ----------------------------------------------------------------------------
-- 5. Acciones del cliente
-- ----------------------------------------------------------------------------
-- Códigos propios: SY003 recordatorio no disponible, SY004 hora no válida,
-- SY005 correo de prueba repetido, SY006 recordatorios apagados.

create or replace function public.cancel_reminder(p_reminder_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  update public.reminders
     set status = 'cancelled',
         locked_until = null
   where id = p_reminder_id
     and user_id = auth.uid()
     and status = 'scheduled';

  if not found then
    raise exception 'Ese recordatorio ya no se puede cancelar.' using errcode = 'SY003';
  end if;
end;
$$;

create or replace function public.restore_reminder(p_reminder_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.reminders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select * into target
    from public.reminders
   where id = p_reminder_id and user_id = auth.uid() and status = 'cancelled'
   for update;

  if not found then
    raise exception 'Ese recordatorio ya no se puede reactivar.' using errcode = 'SY003';
  end if;

  if not public.reminder_wanted(target.user_id, target.kind) then
    raise exception 'Activá ese tipo de recordatorio en Configuración para reactivarlo.'
      using errcode = 'SY006';
  end if;

  if target.send_at <= now() then
    raise exception 'La hora de ese aviso ya pasó. Elegí otra para reprogramarlo.'
      using errcode = 'SY004';
  end if;

  update public.reminders
     set status = 'scheduled',
         attempts = 0,
         error_message = null,
         locked_until = null
   where id = target.id;
end;
$$;

create or replace function public.reschedule_reminder(p_reminder_id uuid, p_send_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.reminders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select * into target
    from public.reminders
   where id = p_reminder_id and user_id = auth.uid() and status in ('scheduled', 'cancelled')
   for update;

  if not found then
    raise exception 'Ese recordatorio ya no se puede reprogramar.' using errcode = 'SY003';
  end if;

  if not public.reminder_wanted(target.user_id, target.kind) then
    raise exception 'Activá ese tipo de recordatorio en Configuración para reprogramarlo.'
      using errcode = 'SY006';
  end if;

  if p_send_at is null or p_send_at <= now() + interval '1 minute' then
    raise exception 'Elegí una hora futura.' using errcode = 'SY004';
  end if;

  if target.event_at is not null and p_send_at >= target.event_at then
    raise exception 'El aviso tiene que llegar antes del evento.' using errcode = 'SY004';
  end if;

  update public.reminders
     set send_at = p_send_at,
         status = 'scheduled',
         attempts = 0,
         error_message = null,
         locked_until = null
   where id = target.id;
end;
$$;

-- Programa un correo de prueba para los próximos minutos (uno cada 10 minutos).
create or replace function public.schedule_test_reminder()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  recipient_address citext;
begin
  if current_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if not public.reminder_wanted(current_user_id, 'custom') then
    raise exception 'Activá los recordatorios por correo para probarlos.' using errcode = 'SY006';
  end if;

  if exists (
    select 1 from public.reminders
     where user_id = current_user_id
       and kind = 'custom'
       and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Ya pediste un correo de prueba hace poco. Probá de nuevo en unos minutos.'
      using errcode = 'SY005';
  end if;

  recipient_address := public.reminder_recipient(current_user_id);

  if recipient_address is null then
    raise exception 'Tu cuenta no tiene un correo para enviar recordatorios.' using errcode = 'SY006';
  end if;

  insert into public.reminders (user_id, kind, send_at, recipient, subject, body)
  values (
    current_user_id,
    'custom',
    now(),
    recipient_address,
    'Correo de prueba de Syntropy',
    'Si te llegó este correo, los recordatorios funcionan. Los próximos avisos van a llegar a esta misma dirección.'
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Funciones de la Edge Function (solo service_role)
-- ----------------------------------------------------------------------------

-- Reclama hasta `p_limit` recordatorios vencidos y devuelve lo necesario para
-- armar cada correo. Los reclamados quedan bloqueados 5 minutos para que dos
-- ejecuciones no manden el mismo. `p_daily_cap` limita los correos por usuario
-- en 24 horas para cuidar la cuota de Resend.
create or replace function public.claim_due_reminders(
  p_limit integer default 25,
  p_daily_cap integer default 20
)
returns table (
  reminder_id uuid,
  kind public.reminder_kind,
  recipient text,
  subject text,
  body text,
  send_at timestamptz,
  event_at timestamptz,
  attempts smallint,
  time_zone text,
  display_name text,
  item_title text,
  item_kind text,
  subject_id uuid,
  subject_name text,
  subject_color text,
  location text,
  duration_minutes integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
begin
  -- 1. Lo que ya no corresponde se borra (por si un disparador no lo hizo).
  delete from public.reminders r
   where r.status = 'scheduled'
     and r.send_at <= now()
     and not public.reminder_wanted(r.user_id, r.kind);

  delete from public.reminders r
   using public.tasks t
   where r.kind = 'task_due' and r.task_id = t.id and r.status = 'scheduled' and t.status = 'done';

  delete from public.reminders r
   using public.study_sessions s
   where r.kind = 'study_session' and r.study_session_id = s.id
     and r.status = 'scheduled' and s.status <> 'scheduled';

  -- 2. Los que llegan tarde no se mandan: el evento ya pasó.
  update public.reminders r
     set status = 'failed',
         error_message = 'No se envió a tiempo: el evento ya había pasado.',
         locked_until = null
   where r.status = 'scheduled'
     and r.send_at <= now()
     and (
       (r.event_at is not null and r.event_at <= now())
       or (r.event_at is null and r.send_at < now() - interval '1 day')
     );

  -- 3. Reclamo.
  return query
  with capped_users as (
    select x.user_id
      from public.reminders x
     where x.status = 'sent' and x.sent_at > now() - interval '1 day'
     group by x.user_id
    having count(*) >= greatest(p_daily_cap, 1)
  ),
  due as (
    select r.id
      from public.reminders r
     where r.status = 'scheduled'
       and r.send_at <= now()
       and (r.locked_until is null or r.locked_until < now())
       and r.user_id not in (select user_id from capped_users)
     order by r.send_at
     limit least(greatest(coalesce(p_limit, 25), 1), 100)
     for update of r skip locked
  ),
  claimed as (
    update public.reminders r
       set locked_until = now() + interval '5 minutes',
           attempts = least(r.attempts + 1, 20)
      from due
     where r.id = due.id
    returning r.*
  )
  select
    c.id,
    c.kind,
    coalesce(public.reminder_recipient(c.user_id), c.recipient)::text,
    c.subject,
    c.body,
    c.send_at,
    c.event_at,
    c.attempts,
    coalesce(p.timezone, 'UTC'),
    coalesce(nullif(btrim(p.full_name), ''), p.username::text),
    coalesce(t.title, e.title),
    case when c.kind = 'task_due' then t.kind::text end,
    sj.id,
    sj.name,
    sj.color_hex,
    case when c.kind = 'exam' then e.location end,
    case
      when c.kind = 'exam' then e.duration_minutes
      when c.kind = 'study_session' then ss.duration_minutes::integer
    end
  from claimed c
  left join public.profiles p on p.id = c.user_id
  left join public.tasks t on t.id = c.task_id
  left join public.study_sessions ss on ss.id = c.study_session_id
  left join public.exams e on e.id = coalesce(c.exam_id, ss.exam_id)
  left join public.subjects sj on sj.id = coalesce(t.subject_id, e.subject_id)
  order by c.send_at;
end;
$$;

-- Guarda el resultado de un envío.
--   'sent'   enviado: se guarda el id de Resend, la dirección y el asunto final.
--   'retry'   error temporal: se reintenta más tarde (hasta 3 intentos).
--   'failed'  error definitivo.
--   'release' no se llegó a intentar (Resend pidió esperar): vuelve a la cola
--             sin gastar el intento.
create or replace function public.finish_reminder(
  p_reminder_id uuid,
  p_outcome text,
  p_provider_message_id text default null,
  p_error text default null,
  p_recipient text default null,
  p_subject text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target public.reminders%rowtype;
begin
  select * into target
    from public.reminders
   where id = p_reminder_id and status = 'scheduled'
   for update;

  if not found then
    -- Se canceló o se borró mientras se enviaba.
    return;
  end if;

  if p_outcome = 'sent' then
    update public.reminders
       set status = 'sent',
           sent_at = now(),
           provider_message_id = left(p_provider_message_id, 200),
           recipient = coalesce(nullif(btrim(p_recipient), '')::citext, recipient),
           subject = coalesce(left(nullif(btrim(p_subject), ''), 200), subject),
           error_message = null,
           locked_until = null
     where id = target.id;
  elsif p_outcome = 'release' then
    update public.reminders
       set attempts = greatest(target.attempts - 1, 0),
           locked_until = null
     where id = target.id;
  elsif p_outcome = 'retry' and target.attempts < 3 then
    update public.reminders
       set error_message = left(coalesce(p_error, 'Error temporal'), 1000),
           locked_until = now() + make_interval(mins => 10 * greatest(target.attempts, 1))
     where id = target.id;
  elsif p_outcome in ('retry', 'failed') then
    update public.reminders
       set status = 'failed',
           error_message = left(coalesce(p_error, 'Error al enviar'), 1000),
           locked_until = null
     where id = target.id;
  else
    raise exception 'Resultado desconocido: %', p_outcome;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. Permisos
-- ----------------------------------------------------------------------------

-- Los recordatorios los crea la base; el cliente solo los lee y usa las
-- funciones de la sección 5 para cambiarlos.
revoke all on table public.reminders from anon;
revoke insert, update, delete on table public.reminders from authenticated;
grant select on table public.reminders to authenticated;

-- Preferencias: la fila la crea el registro y la borra la cascada. El cliente
-- no puede cambiar `reminder_email` (una dirección sin verificar permitiría
-- mandar correos a terceros).
revoke all on table public.user_settings from anon;
revoke insert, update, delete on table public.user_settings from authenticated;
grant select on table public.user_settings to authenticated;
grant update (
  theme,
  email_reminders_enabled,
  default_reminder_minutes,
  remind_tasks,
  remind_exams,
  remind_study_sessions
) on table public.user_settings to authenticated;

-- Supabase da EXECUTE a anon y authenticated en cada función nueva: se quita
-- explícitamente en las internas.
revoke all on function public.reminder_recipient(uuid) from public, anon, authenticated;
revoke all on function public.reminder_wanted(uuid, public.reminder_kind) from public, anon, authenticated;
revoke all on function public.sync_reminder(uuid, public.reminder_kind, uuid, timestamptz, boolean, text, boolean)
  from public, anon, authenticated;
revoke all on function public.resync_user_reminders(uuid, boolean) from public, anon, authenticated;
revoke all on function public.tasks_sync_reminder() from public, anon, authenticated;
revoke all on function public.exams_sync_reminder() from public, anon, authenticated;
revoke all on function public.study_sessions_sync_reminder() from public, anon, authenticated;
revoke all on function public.user_settings_sync_reminders() from public, anon, authenticated;

revoke all on function public.claim_due_reminders(integer, integer) from public, anon, authenticated;
revoke all on function public.finish_reminder(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer, integer) to service_role;
grant execute on function public.finish_reminder(uuid, text, text, text, text, text) to service_role;

revoke all on function public.cancel_reminder(uuid) from public, anon;
revoke all on function public.restore_reminder(uuid) from public, anon;
revoke all on function public.reschedule_reminder(uuid, timestamptz) from public, anon;
revoke all on function public.schedule_test_reminder() from public, anon;
grant execute on function public.cancel_reminder(uuid) to authenticated;
grant execute on function public.restore_reminder(uuid) to authenticated;
grant execute on function public.reschedule_reminder(uuid, timestamptz) to authenticated;
grant execute on function public.schedule_test_reminder() to authenticated;

-- ----------------------------------------------------------------------------
-- 8. Comprobación
-- ----------------------------------------------------------------------------

do $$
declare
  column_name text;
  function_name text;
begin
  if has_table_privilege('authenticated', 'public.reminders', 'INSERT')
     or has_table_privilege('authenticated', 'public.reminders', 'UPDATE')
     or has_table_privilege('authenticated', 'public.reminders', 'DELETE') then
    raise exception 'El rol authenticated todavía puede escribir en reminders directamente.';
  end if;

  if not has_table_privilege('authenticated', 'public.reminders', 'SELECT') then
    raise exception 'El rol authenticated no puede leer sus recordatorios.';
  end if;

  foreach column_name in array array['reminder_email', 'user_id', 'week_starts_on']
  loop
    if has_column_privilege('authenticated', 'public.user_settings', column_name, 'UPDATE') then
      raise exception 'user_settings.% sigue siendo editable por el rol authenticated.', column_name;
    end if;
  end loop;

  foreach column_name in array array['email_reminders_enabled', 'default_reminder_minutes', 'remind_tasks', 'remind_exams', 'remind_study_sessions']
  loop
    if not has_column_privilege('authenticated', 'public.user_settings', column_name, 'UPDATE') then
      raise exception 'user_settings.% no es editable por el rol authenticated y la app la necesita.', column_name;
    end if;
  end loop;

  foreach function_name in array array[
    'public.claim_due_reminders(integer, integer)',
    'public.finish_reminder(uuid, text, text, text, text, text)',
    'public.sync_reminder(uuid, public.reminder_kind, uuid, timestamptz, boolean, text, boolean)',
    'public.resync_user_reminders(uuid, boolean)',
    'public.reminder_recipient(uuid)'
  ]
  loop
    if has_function_privilege('authenticated', function_name, 'EXECUTE')
       or has_function_privilege('anon', function_name, 'EXECUTE') then
      raise exception 'El cliente puede ejecutar %, que es interna.', function_name;
    end if;
  end loop;

  if not has_function_privilege('service_role', 'public.claim_due_reminders(integer, integer)', 'EXECUTE') then
    raise exception 'service_role no puede reclamar recordatorios.';
  end if;

  if not has_function_privilege('authenticated', 'public.cancel_reminder(uuid)', 'EXECUTE') then
    raise exception 'El cliente no puede cancelar recordatorios.';
  end if;
end;
$$;

commit;
