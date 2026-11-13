// Comprobaciones de base de datos: migraciones 001–006, protección de los
// consentimientos, aislamiento RLS, nodos, biblioteca, recordatorios y
// versiones de los textos legales.
// Uso: node validate.mjs
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { MIGRATIONS_DIR, asUser, createAuthUser, createDatabase } from './db.mjs'

const results = []

function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${name}${detail ? ` — ${detail}` : ''}`)
}

/** Espera que la operación falle con el código de PostgreSQL indicado. */
async function expectError(name, code, fn) {
  try {
    await fn()
    record(name, false, 'la operación no falló')
  } catch (error) {
    record(name, error.code === code, `código ${error.code}: ${error.message}`)
  }
}

const consents = { terms_accepted: 'true', privacy_accepted: 'true', age_confirmed: 'true' }

async function seedUser(db, email, username) {
  const id = await createAuthUser(db, { email, metadata: { username, ...consents } })
  const year = await asUser(db, id, async (tx) => {
    const { rows } = await tx.query(
      `insert into academic_years (user_id, name, starts_on, ends_on, is_active)
       values ($1, '2026', '2026-03-01', '2026-12-20', true) returning id`,
      [id],
    )
    return rows[0].id
  })
  const subject = await asUser(db, id, async (tx) => {
    const { rows } = await tx.query(
      `insert into subjects (user_id, academic_year_id, name, color_hex)
       values ($1, $2, 'Matemática', '#2F6BFF') returning id`,
      [id, year],
    )
    return rows[0].id
  })
  return { id, year, subject }
}

// --------------------------------------------------------------------------
// 1. Antes de 003: el defecto existe
// --------------------------------------------------------------------------
{
  const { db, applied } = await createDatabase({ upTo: '002' })
  record('Migraciones 001 y 002 se aplican sin errores', applied.length === 2, applied.join(', '))

  const a = await seedUser(db, 'a@prueba.test', 'usuario_a')
  const { affectedRows } = await asUser(db, a.id, (tx) =>
    tx.query(`update profiles set terms_accepted_at = null, privacy_accepted_at = null,
              age_confirmed_at = null where id = $1`, [a.id]),
  )
  record(
    'Sin 003, un usuario puede borrar sus propios consentimientos (defecto confirmado)',
    affectedRows === 1,
    `${affectedRows} fila modificada`,
  )
  await db.close()
}

// --------------------------------------------------------------------------
// 2. Con 003
// --------------------------------------------------------------------------
const { db, applied } = await createDatabase()
record('Todas las migraciones se aplican sin errores', applied.length >= 6, applied.join(', '))

const a = await seedUser(db, 'a@prueba.test', 'usuario_a')
const b = await seedUser(db, 'b@prueba.test', 'usuario_b')

{
  const { rows } = await db.query(
    `select terms_accepted_at is not null and privacy_accepted_at is not null
            and age_confirmed_at is not null as ok from profiles where id = $1`,
    [a.id],
  )
  record('El trigger de alta sigue guardando los tres consentimientos', rows[0].ok === true)
}

await expectError('El cliente no puede borrar sus consentimientos', '42501', () =>
  asUser(db, a.id, (tx) =>
    tx.query(`update profiles set terms_accepted_at = null, privacy_accepted_at = null,
              age_confirmed_at = null where id = $1`, [a.id]),
  ),
)

await expectError('El cliente no puede cambiar la fecha de un consentimiento', '42501', () =>
  asUser(db, a.id, (tx) =>
    tx.query(`update profiles set age_confirmed_at = now() - interval '5 years' where id = $1`, [
      a.id,
    ]),
  ),
)

await expectError('El cliente no puede cambiar el id ni la fecha de alta', '42501', () =>
  asUser(db, a.id, (tx) => tx.query(`update profiles set created_at = now() where id = $1`, [a.id])),
)

{
  // Lo mismo que envía la app: perfil, zona horaria, avatar y fin del onboarding.
  const { rows } = await asUser(db, a.id, (tx) =>
    tx.query(
      `update profiles set username = 'martina', full_name = 'Martina Gómez',
              timezone = 'America/Argentina/Buenos_Aires', locale = 'es',
              avatar_path = $1 || '/avatar.png', onboarded_at = now()
       where id = $1 returning *`,
      [a.id],
    ),
  )
  record(
    'La app sigue pudiendo editar perfil, avatar, zona horaria y onboarding',
    rows.length === 1 && rows[0].username === 'martina' && rows[0].onboarded_at !== null,
  )
  record(
    'updated_at se sigue actualizando por trigger',
    rows[0].updated_at.getTime() >= rows[0].created_at.getTime(),
  )
}

{
  const { affectedRows } = await asUser(db, a.id, (tx) =>
    tx.query(`update profiles set full_name = 'Intruso' where id = $1`, [b.id]),
  )
  record('Un usuario no puede editar el perfil de otro', affectedRows === 0, `${affectedRows} filas`)
}

// --------------------------------------------------------------------------
// 3. Tablas de la Fase 3: restricciones
// --------------------------------------------------------------------------
const taskA = await asUser(db, a.id, async (tx) => {
  const { rows } = await tx.query(
    `insert into tasks (user_id, subject_id, title, due_at) values ($1, $2, 'Ensayo', now() + interval '3 days')
     returning *`,
    [a.id, a.subject],
  )
  return rows[0]
})
record(
  'Una tarea nueva queda pendiente, de tipo tarea y sin color propio',
  taskA.status === 'pending' && taskA.kind === 'task' && taskA.color_hex === null,
)

await expectError('Una tarea terminada exige fecha de finalización', '23514', () =>
  asUser(db, a.id, (tx) => tx.query(`update tasks set status = 'done' where id = $1`, [taskA.id])),
)

{
  const { rows } = await asUser(db, a.id, (tx) =>
    tx.query(`update tasks set status = 'done', completed_at = now() where id = $1 returning status`, [
      taskA.id,
    ]),
  )
  record('Terminar una tarea con su fecha de finalización', rows[0]?.status === 'done')
}

await expectError('Volver a pendiente exige limpiar la fecha de finalización', '23514', () =>
  asUser(db, a.id, (tx) => tx.query(`update tasks set status = 'pending' where id = $1`, [taskA.id])),
)

await expectError('El color de la tarea debe ser hexadecimal', '23514', () =>
  asUser(db, a.id, (tx) =>
    tx.query(`insert into tasks (user_id, subject_id, title, due_at, color_hex)
              values ($1, $2, 'Color inválido', now(), 'rojo')`, [a.id, a.subject]),
  ),
)

await expectError('El plan de estudio va completo o vacío', '23514', () =>
  asUser(db, a.id, (tx) =>
    tx.query(`insert into exams (user_id, subject_id, title, exam_at, study_days_before)
              values ($1, $2, 'Parcial', now() + interval '10 days', 7)`, [a.id, a.subject]),
  ),
)

const examA = await asUser(db, a.id, async (tx) => {
  const { rows } = await tx.query(
    `insert into exams (user_id, subject_id, title, exam_at, duration_minutes, study_days_before,
                        study_frequency_days, study_session_minutes, study_time)
     values ($1, $2, 'Parcial 1', now() + interval '10 days', 90, 7, 2, 45, '18:00') returning *`,
    [a.id, a.subject],
  )
  return rows[0]
})
record('Examen con plan de estudio completo', examA.study_time === '18:00:00', `study_time = ${examA.study_time}`)

const sessionA = await asUser(db, a.id, async (tx) => {
  const { rows } = await tx.query(
    `insert into study_sessions (user_id, exam_id, scheduled_at, duration_minutes)
     values ($1, $2, date_trunc('hour', now()) + interval '2 days', 45) returning *`,
    [a.id, examA.id],
  )
  return rows[0]
})
record('Sesión de estudio programada', sessionA.status === 'scheduled')

await expectError('No se repite una sesión en el mismo horario del mismo examen', '23505', () =>
  asUser(db, a.id, (tx) =>
    tx.query(`insert into study_sessions (user_id, exam_id, scheduled_at, duration_minutes)
              values ($1, $2, $3, 45)`, [a.id, examA.id, sessionA.scheduled_at]),
  ),
)

// --------------------------------------------------------------------------
// 4. Tablas de la Fase 3: aislamiento RLS entre A y B
// --------------------------------------------------------------------------
for (const table of ['tasks', 'exams', 'study_sessions']) {
  const own = await asUser(db, a.id, (tx) => tx.query(`select id from ${table}`))
  const foreign = await asUser(db, b.id, (tx) => tx.query(`select id from ${table}`))
  const anon = await asUser(db, null, (tx) => tx.query(`select id from ${table}`).catch(() => ({ rows: [] })))
  record(
    `${table}: A ve sus filas, B y un anónimo no ven ninguna`,
    own.rows.length > 0 && foreign.rows.length === 0 && anon.rows.length === 0,
    `A ${own.rows.length}, B ${foreign.rows.length}, anónimo ${anon.rows.length}`,
  )
}

{
  const updated = await asUser(db, b.id, (tx) =>
    tx.query(`update tasks set title = 'Modificada por B' where id = $1`, [taskA.id]),
  )
  const deleted = await asUser(db, b.id, (tx) => tx.query(`delete from exams where id = $1`, [examA.id]))
  const still = await db.query(`select title from tasks where id = $1`, [taskA.id])
  record(
    'B no puede modificar ni borrar tareas o exámenes de A',
    updated.affectedRows === 0 && deleted.affectedRows === 0 && still.rows[0].title === 'Ensayo',
  )
}

await expectError('B no puede crear una tarea a nombre de A', '42501', () =>
  asUser(db, b.id, (tx) =>
    tx.query(`insert into tasks (user_id, subject_id, title, due_at) values ($1, $2, 'Ajena', now())`, [
      a.id,
      a.subject,
    ]),
  ),
)

await expectError('B no puede colgar una tarea propia de una asignatura de A', '23503', () =>
  asUser(db, b.id, (tx) =>
    tx.query(`insert into tasks (user_id, subject_id, title, due_at) values ($1, $2, 'Cruzada', now())`, [
      b.id,
      a.subject,
    ]),
  ),
)

await expectError('B no puede agregar sesiones a un examen de A', '23503', () =>
  asUser(db, b.id, (tx) =>
    tx.query(`insert into study_sessions (user_id, exam_id, scheduled_at, duration_minutes)
              values ($1, $2, now(), 30)`, [b.id, examA.id]),
  ),
)

// --------------------------------------------------------------------------
// 5. Cascadas
// --------------------------------------------------------------------------
{
  await asUser(db, a.id, (tx) => tx.query(`delete from exams where id = $1`, [examA.id]))
  const { rows } = await db.query(`select count(*)::int as total from study_sessions where exam_id = $1`, [
    examA.id,
  ])
  record('Borrar un examen borra sus sesiones de estudio', rows[0].total === 0)
}

{
  await asUser(db, a.id, (tx) => tx.query(`delete from subjects where id = $1`, [a.subject]))
  const { rows } = await db.query(`select count(*)::int as total from tasks where user_id = $1`, [a.id])
  record('Borrar una asignatura borra sus tareas', rows[0].total === 0)
}

// --------------------------------------------------------------------------
// 6. Nodos de conocimiento (Fase 5)
// --------------------------------------------------------------------------
{
  const subjects = await asUser(db, b.id, (tx) =>
    tx.query(
      `insert into subjects (user_id, academic_year_id, name, color_hex)
       values ($1, $2, 'Física', '#22B8CF'), ($1, $2, 'Química', '#37B24D') returning id`,
      [b.id, b.year],
    ),
  )
  const [fisica, quimica] = subjects.rows.map((row) => row.id)
  const insertNode = (tx, subject, parent, name, difficulty = 5, mastery = 5) =>
    tx.query(
      `insert into nodes (user_id, subject_id, parent_id, is_root, name, difficulty, mastery)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [b.id, subject, parent, parent === null, name, parent === null ? null : difficulty, parent === null ? null : mastery],
    )

  const root = (await asUser(db, b.id, (tx) => insertNode(tx, fisica, null, 'Física'))).rows[0].id
  record('Nodo raíz de una asignatura sin dificultad ni dominio', Boolean(root))

  await expectError('Una sola raíz por asignatura', '23505', () =>
    asUser(db, b.id, (tx) => insertNode(tx, fisica, null, 'Otra raíz')),
  )

  await expectError('Un tema exige padre, dificultad y dominio', '23514', () =>
    asUser(db, b.id, (tx) =>
      tx.query(
        `insert into nodes (user_id, subject_id, parent_id, is_root, name) values ($1, $2, $3, false, 'Sin datos')`,
        [b.id, fisica, root],
      ),
    ),
  )

  const cinematica = (await asUser(db, b.id, (tx) => insertNode(tx, fisica, root, 'Cinemática'))).rows[0].id
  const mru = (await asUser(db, b.id, (tx) => insertNode(tx, fisica, cinematica, 'MRU'))).rows[0].id
  const quimicaRoot = (await asUser(db, b.id, (tx) => insertNode(tx, quimica, null, 'Química'))).rows[0].id
  const estequiometria = (await asUser(db, b.id, (tx) => insertNode(tx, quimica, quimicaRoot, 'Estequiometría'))).rows[0].id

  await expectError('El padre de un tema tiene que ser de la misma asignatura', '23503', () =>
    asUser(db, b.id, (tx) => insertNode(tx, quimica, cinematica, 'Cruzado')),
  )

  await asUser(db, b.id, (tx) =>
    tx.query(
      `insert into node_links (user_id, source_node_id, target_node_id, label) values ($1, $2, $3, 'proporciones')`,
      [b.id, mru, estequiometria],
    ),
  )
  record('Se pueden conectar temas de asignaturas distintas', true)

  await expectError('No se duplica una conexión, aunque sea en el otro sentido', '23505', () =>
    asUser(db, b.id, (tx) =>
      tx.query(`insert into node_links (user_id, source_node_id, target_node_id) values ($1, $2, $3)`, [
        b.id,
        estequiometria,
        mru,
      ]),
    ),
  )

  const seenByA = await asUser(db, a.id, (tx) => tx.query(`select id from nodes where subject_id = $1`, [fisica]))
  const linksByA = await asUser(db, a.id, (tx) => tx.query(`select id from node_links`))
  record(
    'A no ve los nodos ni las conexiones de B',
    seenByA.rows.length === 0 && linksByA.rows.length === 0,
    `nodos ${seenByA.rows.length}, conexiones ${linksByA.rows.length}`,
  )

  await expectError('A no puede colgar un tema de un nodo de B', '23503', () =>
    asUser(db, a.id, (tx) =>
      tx.query(
        `insert into nodes (user_id, subject_id, parent_id, is_root, name, difficulty, mastery)
         values ($1, $2, $3, false, 'Intruso', 5, 5)`,
        [a.id, fisica, cinematica],
      ),
    ),
  )

  // Una tarea vinculada a un subtema queda sin tema al borrar el subárbol.
  const task = (
    await asUser(db, b.id, (tx) =>
      tx.query(
        `insert into tasks (user_id, subject_id, node_id, title, due_at) values ($1, $2, $3, 'Ejercicios MRU', now()) returning id`,
        [b.id, fisica, mru],
      ),
    )
  ).rows[0].id

  // Con un adjunto en el subárbol, el borrado se bloquea.
  await asUser(db, b.id, (tx) =>
    tx.query(
      `insert into sources (user_id, subject_id, node_id, title, source_type, external_url)
       values ($1, $2, $3, 'Video de MRU', 'link', 'https://example.com/mru')`,
      [b.id, fisica, mru],
    ),
  )
  await expectError('No se borra un tema que tiene adjuntos en su subárbol', '23503', () =>
    asUser(db, b.id, (tx) => tx.query(`delete from nodes where id = $1`, [cinematica])),
  )

  await asUser(db, b.id, (tx) => tx.query(`delete from sources where node_id = $1`, [mru]))
  await asUser(db, b.id, (tx) => tx.query(`delete from nodes where id = $1`, [cinematica]))
  const left = await db.query(`select id from nodes where id in ($1, $2)`, [cinematica, mru])
  const orphanTask = await db.query(`select node_id from tasks where id = $1`, [task])
  const links = await db.query(`select id from node_links where source_node_id = $1 or target_node_id = $1`, [mru])
  record(
    'Borrar un tema borra su subárbol y sus conexiones; la tarea queda sin tema',
    left.rows.length === 0 && orphanTask.rows[0].node_id === null && links.rows.length === 0,
  )
}

// --------------------------------------------------------------------------
// 7. Biblioteca (Fase 6): límite de espacio y campos que no se editan
// --------------------------------------------------------------------------
{
  const MB = 1024 * 1024
  const subject = (
    await asUser(db, a.id, (tx) =>
      tx.query(
        `insert into subjects (user_id, academic_year_id, name, color_hex) values ($1, $2, 'Geografía', '#FF922B') returning id`,
        [a.id, a.year],
      ),
    )
  ).rows[0].id
  const insertFile = (size, title) =>
    asUser(db, a.id, (tx) =>
      tx.query(
        `insert into sources (user_id, subject_id, title, source_type, storage_path, size_bytes, mime_type)
         values ($1::uuid, $2, $3, 'document', $1::text || '/' || gen_random_uuid() || '/archivo.pdf', $4, 'application/pdf') returning id`,
        [a.id, subject, title, size],
      ),
    )

  const first = (await insertFile(150 * MB, 'Atlas')).rows[0].id
  record('Se guarda una fuente dentro del límite de espacio', Boolean(first))

  await expectError('No se supera el límite de 200 MB por usuario', 'SY001', () => insertFile(60 * MB, 'Mapa grande'))

  const link = await asUser(db, a.id, (tx) =>
    tx.query(
      `insert into sources (user_id, subject_id, title, source_type, external_url) values ($1, $2, 'Enlace', 'link', 'https://example.com') returning id`,
      [a.id, subject],
    ),
  )
  record('Los enlaces no ocupan espacio', link.rows.length === 1)

  await expectError('El tamaño declarado no se puede cambiar después', '42501', () =>
    asUser(db, a.id, (tx) => tx.query(`update sources set size_bytes = 0 where id = $1`, [first])),
  )

  const { rows } = await asUser(db, a.id, (tx) =>
    tx.query(`update sources set title = 'Atlas mundial', tags = '{mapas}' where id = $1 returning title`, [first]),
  )
  record('El título y las etiquetas siguen siendo editables', rows[0]?.title === 'Atlas mundial')

  const limits = await asUser(db, a.id, (tx) => tx.query(`select * from public.library_limits()`))
  record(
    'La app puede leer los límites',
    Number(limits.rows[0].max_bytes) === 200 * MB && limits.rows[0].max_sources === 1000,
  )

  const foreign = await asUser(db, b.id, (tx) => tx.query(`select id from sources where id = $1`, [first]))
  record('Otra cuenta no ve las fuentes ajenas', foreign.rows.length === 0)
}

// --------------------------------------------------------------------------
// 8. Recordatorios por correo (Fase 7)
// --------------------------------------------------------------------------
{
  const asService = (fn) =>
    db.transaction(async (tx) => {
      await tx.exec('set local role service_role')
      return fn(tx)
    })
  const remindersOf = async (userId) =>
    (await db.query(`select * from reminders where user_id = $1 order by send_at`, [userId])).rows
  const subject = (
    await asUser(db, b.id, (tx) =>
      tx.query(
        `insert into subjects (user_id, academic_year_id, name, color_hex) values ($1, $2, 'Taller de recordatorios', '#12B886') returning id`,
        [b.id, b.year],
      ),
    )
  ).rows[0].id
  const task = (
    await asUser(db, b.id, (tx) =>
      tx.query(
        `insert into tasks (user_id, subject_id, title, due_at) values ($1, $2, 'Informe de laboratorio', now() + interval '3 days') returning id`,
        [b.id, subject],
      ),
    )
  ).rows[0].id

  record('Con los recordatorios apagados no se programa nada', (await remindersOf(b.id)).length === 0)

  await asUser(db, b.id, (tx) =>
    tx.query(`update user_settings set email_reminders_enabled = true where user_id = $1`, [b.id]),
  )
  let rows = await remindersOf(b.id)
  record(
    'Al activarlos se programa el aviso de la tarea 1 día antes, al correo de la cuenta',
    rows.length === 1 &&
      rows[0].kind === 'task_due' &&
      rows[0].recipient === 'b@prueba.test' &&
      new Date(rows[0].event_at) - new Date(rows[0].send_at) === 86_400_000,
  )

  await asUser(db, b.id, (tx) =>
    tx.query(`update tasks set due_at = now() + interval '6 days' where id = $1`, [task]),
  )
  rows = await remindersOf(b.id)
  record(
    'Si se mueve la tarea, el aviso se reprograma',
    rows.length === 1 && Math.round((new Date(rows[0].send_at) - Date.now()) / 3_600_000) === 120,
  )

  await asUser(db, b.id, (tx) =>
    tx.query(`update tasks set status = 'done', completed_at = now() where id = $1`, [task]),
  )
  record('Al terminar la tarea, el aviso desaparece', (await remindersOf(b.id)).length === 0)

  await asUser(db, b.id, (tx) =>
    tx.query(`update tasks set status = 'pending', completed_at = null where id = $1`, [task]),
  )
  const near = (
    await asUser(db, b.id, (tx) =>
      tx.query(
        `insert into tasks (user_id, subject_id, title, due_at) values ($1, $2, 'Entrega en 2 horas', now() + interval '2 hours') returning id`,
        [b.id, subject],
      ),
    )
  ).rows[0].id
  rows = await remindersOf(b.id)
  record(
    'No se programa un aviso cuya hora ya pasó',
    rows.length === 1 && !rows.some((row) => row.task_id === near),
  )

  const reminder = rows[0].id
  await asUser(db, b.id, (tx) => tx.query(`select cancel_reminder($1)`, [reminder]))
  await asUser(db, b.id, (tx) =>
    tx.query(`update user_settings set default_reminder_minutes = 60 where user_id = $1`, [b.id]),
  )
  rows = await remindersOf(b.id)
  const cancelled = rows.find((row) => row.id === reminder)
  record(
    'Lo cancelado sigue cancelado al cambiar la anticipación, con la hora nueva',
    cancelled?.status === 'cancelled' &&
      new Date(cancelled.event_at) - new Date(cancelled.send_at) === 3_600_000,
  )
  record(
    'Con menos anticipación, la tarea cercana pasa a tener aviso',
    rows.some((row) => row.task_id === near && row.status === 'scheduled'),
  )

  await asUser(db, b.id, (tx) => tx.query(`select restore_reminder($1)`, [reminder]))
  const manual = new Date(Date.now() + 2 * 86_400_000)
  await asUser(db, b.id, (tx) => tx.query(`select reschedule_reminder($1, $2)`, [reminder, manual.toISOString()]))
  await asUser(db, b.id, (tx) =>
    tx.query(`update user_settings set remind_study_sessions = true where user_id = $1`, [b.id]),
  )
  rows = await remindersOf(b.id)
  const rescheduled = rows.find((row) => row.id === reminder)
  record(
    'Activar otro tipo de aviso no pisa una hora elegida a mano',
    rescheduled?.status === 'scheduled' && Math.abs(new Date(rescheduled.send_at) - manual) < 1000,
  )

  await expectError('No se reprograma después del evento', 'SY004', () =>
    asUser(db, b.id, (tx) =>
      tx.query(`select reschedule_reminder($1, now() + interval '30 days')`, [reminder]),
    ),
  )
  await expectError('Otra cuenta no puede cancelar un aviso ajeno', 'SY003', () =>
    asUser(db, a.id, (tx) => tx.query(`select cancel_reminder($1)`, [reminder])),
  )
  const foreign = await asUser(db, a.id, (tx) => tx.query(`select id from reminders where id = $1`, [reminder]))
  record('Otra cuenta no ve los avisos ajenos', foreign.rows.length === 0)

  await expectError('El cliente no puede crear avisos directamente', '42501', () =>
    asUser(db, b.id, (tx) =>
      tx.query(
        `insert into reminders (user_id, kind, send_at, recipient, subject) values ($1, 'custom', now(), 'otro@prueba.test', 'Hola')`,
        [b.id],
      ),
    ),
  )
  await expectError('El cliente no puede cambiar la dirección de destino', '42501', () =>
    asUser(db, b.id, (tx) =>
      tx.query(`update user_settings set reminder_email = 'otro@prueba.test' where user_id = $1`, [b.id]),
    ),
  )
  await expectError('El cliente no puede reclamar avisos para enviar', '42501', () =>
    asUser(db, b.id, (tx) => tx.query(`select * from claim_due_reminders()`)),
  )

  await asUser(db, b.id, (tx) => tx.query(`select schedule_test_reminder()`))
  await expectError('Un correo de prueba cada 10 minutos', 'SY005', () =>
    asUser(db, b.id, (tx) => tx.query(`select schedule_test_reminder()`)),
  )

  // Un aviso vencido de un evento que ya pasó no se manda.
  await db.query(
    `update reminders set send_at = now() - interval '2 days', event_at = now() - interval '1 day'
      where id = $1`,
    [reminder],
  )
  const claimed = (await asService((tx) => tx.query(`select * from claim_due_reminders(10, 20)`))).rows
  const late = (await db.query(`select status, error_message from reminders where id = $1`, [reminder])).rows[0]
  record(
    'La función reclama el correo de prueba con los datos para armarlo',
    claimed.length === 1 && claimed[0].kind === 'custom' && claimed[0].recipient === 'b@prueba.test' && claimed[0].attempts === 1,
  )
  record('Un aviso que llega tarde queda como no enviado', late.status === 'failed')

  const again = (await asService((tx) => tx.query(`select * from claim_due_reminders(10, 20)`))).rows
  record('Lo reclamado no se vuelve a reclamar mientras se envía', again.length === 0)

  await asService((tx) => tx.query(`select finish_reminder($1, 'retry', null, 'Resend 500')`, [claimed[0].reminder_id]))
  let test = (await db.query(`select status, attempts, locked_until > now() as locked from reminders where id = $1`, [claimed[0].reminder_id])).rows[0]
  record('Un error temporal deja el aviso para reintentar más tarde', test.status === 'scheduled' && test.locked)

  await db.query(`update reminders set locked_until = null where id = $1`, [claimed[0].reminder_id])
  const retry = (await asService((tx) => tx.query(`select * from claim_due_reminders(10, 20)`))).rows
  await asService((tx) =>
    tx.query(`select finish_reminder($1, 'sent', 're_prueba', null, 'b@prueba.test', 'Asunto final')`, [retry[0].reminder_id]),
  )
  test = (await db.query(`select status, provider_message_id, subject, attempts from reminders where id = $1`, [claimed[0].reminder_id])).rows[0]
  record(
    'Un envío exitoso guarda el id de Resend y el asunto final',
    test.status === 'sent' && test.provider_message_id === 're_prueba' && test.subject === 'Asunto final' && test.attempts === 2,
  )

  await asUser(db, b.id, (tx) =>
    tx.query(`update user_settings set email_reminders_enabled = false where user_id = $1`, [b.id]),
  )
  rows = await remindersOf(b.id)
  record(
    'Al apagarlos se borra lo programado y queda el historial',
    rows.every((row) => row.status !== 'scheduled') && rows.some((row) => row.status === 'sent'),
  )
}

// --------------------------------------------------------------------------
// 9. Versiones de los textos legales (Fase 8)
// --------------------------------------------------------------------------
{
  const versionsOf = async (userId) =>
    (await db.query(`select terms_version, privacy_version, age_confirmed_at from profiles where id = $1`, [userId]))
      .rows[0]
  const current = (await db.query(`select * from current_legal_versions()`)).rows[0]

  const fresh = await createAuthUser(db, {
    email: 'nueva@prueba.test',
    metadata: {
      username: 'nueva',
      ...consents,
      terms_version: current.terms_version,
      privacy_version: current.privacy_version,
    },
  })
  let row = await versionsOf(fresh)
  record(
    'Al registrarse se guarda la versión vigente que mostró la app',
    row.terms_version === current.terms_version && row.privacy_version === current.privacy_version,
  )

  const stale = await createAuthUser(db, {
    email: 'vieja@prueba.test',
    metadata: { username: 'vieja', ...consents, terms_version: '2020-01-01', privacy_version: '2020-01-01' },
  })
  row = await versionsOf(stale)
  record('Una versión que no es la vigente no se guarda', row.terms_version === null && row.privacy_version === null)

  await expectError('No se acepta una versión que no es la vigente', 'SY007', () =>
    asUser(db, stale, (tx) => tx.query(`select accept_legal_documents('2020-01-01', $1)`, [current.privacy_version])),
  )
  await asUser(db, stale, (tx) =>
    tx.query(`select accept_legal_documents($1, $2)`, [current.terms_version, current.privacy_version]),
  )
  row = await versionsOf(stale)
  record('Aceptar la versión vigente la registra', row.terms_version === current.terms_version)

  const noConsents = await createAuthUser(db, { email: 'sin@prueba.test', metadata: { username: 'sin_consent' } })
  await expectError('Sin edad confirmada, hay que confirmarla al aceptar', 'SY008', () =>
    asUser(db, noConsents, (tx) =>
      tx.query(`select accept_legal_documents($1, $2)`, [current.terms_version, current.privacy_version]),
    ),
  )
  await asUser(db, noConsents, (tx) =>
    tx.query(`select accept_legal_documents($1, $2, true)`, [current.terms_version, current.privacy_version]),
  )
  row = await versionsOf(noConsents)
  record('Con la edad confirmada se guardan los tres consentimientos', row.age_confirmed_at !== null)

  await expectError('El cliente no puede escribir la versión aceptada', '42501', () =>
    asUser(db, fresh, (tx) => tx.query(`update profiles set terms_version = '2099-01-01' where id = $1`, [fresh])),
  )
  await expectError('Sin sesión no se aceptan documentos', '42501', () =>
    asUser(db, null, (tx) => tx.query(`select accept_legal_documents($1, $2)`, [current.terms_version, current.privacy_version])),
  )

  const anonVersions = await asUser(db, null, (tx) => tx.query(`select * from current_legal_versions()`))
  record('Sin sesión se pueden leer las versiones vigentes', anonVersions.rows[0].terms_version === current.terms_version)
}

// Cuentas creadas antes de la 006: quedan registradas con el borrador.
{
  const { db: older } = await createDatabase({ upTo: '005' })
  const before = await createAuthUser(older, { email: 'antes@prueba.test', metadata: { username: 'antes', ...consents } })
  await older.exec(await readFile(path.join(MIGRATIONS_DIR, '006_versiones_legales.sql'), 'utf8'))
  const { rows } = await older.query(`select terms_version, privacy_version from profiles where id = $1`, [before])
  record(
    'Las cuentas anteriores quedan con el borrador del 10/11 y se les pide aceptar',
    rows[0].terms_version === 'borrador-2026-11-10' && rows[0].privacy_version === 'borrador-2026-11-10',
  )
  await older.exec(await readFile(path.join(MIGRATIONS_DIR, '006_versiones_legales.sql'), 'utf8'))
  record('La migración 006 se puede ejecutar dos veces', true)
  await older.close()
}

await db.close()

const failed = results.filter((result) => !result.ok)
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones aprobadas`)
process.exit(failed.length === 0 ? 0 : 1)
