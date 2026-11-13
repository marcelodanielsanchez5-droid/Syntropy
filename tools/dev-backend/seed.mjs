// Datos de ejemplo para el backend local. Las fechas se calculan a partir de
// hoy para que el calendario, la campana y el horario siempre tengan contenido.
// Cuenta de prueba (solo local): ver TEST_ACCOUNT.

export const TEST_ACCOUNT = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'estudiante@syntropy.test',
  password: 'Syntropy-Prueba-2026',
}

const TZ_OFFSET = '-03:00' // America/Argentina/Buenos_Aires, sin horario de verano
const DAY_MS = 86_400_000

/** Fecha local (`YYYY-MM-DD`) en Buenos Aires, desplazada `days` días desde hoy. */
function localDate(days = 0) {
  return new Date(Date.now() - 3 * 3_600_000 + days * DAY_MS).toISOString().slice(0, 10)
}

function at(days, time) {
  return `${localDate(days)}T${time}:00${TZ_OFFSET}`
}

export async function seed(db) {
  const { id, email, password } = TEST_ACCOUNT
  const metadata = {
    username: 'martina',
    full_name: 'Martina Gómez',
    timezone: 'America/Argentina/Buenos_Aires',
    terms_accepted: 'true',
    privacy_accepted: 'true',
    age_confirmed: 'true',
  }

  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)`, [
    id,
    email,
    JSON.stringify(metadata),
  ])
  await db.query(`update public.profiles set onboarded_at = now() where id = $1`, [id])

  const year = (
    await db.query(
      `insert into public.academic_years (user_id, name, starts_on, ends_on, is_active)
       values ($1, '5.º año · 2026', '2026-03-01', '2026-12-20', true) returning id`,
      [id],
    )
  ).rows[0].id

  const subjects = {}
  for (const [key, name, color, teachers, description] of [
    ['mate', 'Matemática', '#2F6BFF', '{"Laura Gómez"}', 'Funciones, límites y derivadas.'],
    ['lengua', 'Lengua', '#E01462', '{"Ana Pérez"}', 'Literatura latinoamericana y producción de textos.'],
    ['ingles', 'Inglés', '#FFDE00', '{"John Smith"}', 'Nivel B1: writing, listening y oral.'],
    ['historia', 'Historia', '#12B886', '{"Carlos Ruiz"}', 'Argentina en el siglo XX.'],
    ['bio', 'Biología', '#94D82D', '{"Sofía Díaz","Pablo Ortiz"}', 'Genética y evolución, con laboratorio.'],
  ]) {
    subjects[key] = (
      await db.query(
        `insert into public.subjects (user_id, academic_year_id, name, color_hex, teacher_names, description)
         values ($1, $2, $3, $4, $5::text[], $6) returning id`,
        [id, year, name, color, teachers, description],
      )
    ).rows[0].id
  }

  // Mapa de temas: Matemática y Lengua con árbol; el resto lo genera la app.
  async function node(subject, name, parentId, difficulty, mastery, x, y, extra = {}) {
    const { rows } = await db.query(
      `insert into public.nodes (user_id, subject_id, parent_id, is_root, name, difficulty, mastery,
         position_x, position_y, summary, description)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
      [id, subjects[subject], parentId, parentId === null, name, difficulty, mastery, x, y,
        extra.summary ?? null, extra.description ?? null],
    )
    return rows[0].id
  }

  const nodes = {}
  nodes.mateRoot = await node('mate', 'Matemática', null, null, null, 300, 0)
  nodes.funciones = await node('mate', 'Funciones', nodes.mateRoot, 4, 7, 150, 170, {
    description: 'Relación entre dos conjuntos.',
    summary: "Función: a cada x le corresponde un único y\n- Dominio e imagen\n- Gráfico en el plano\n  - Lineales: rectas\n  - Cuadráticas: parábolas",
  })
  nodes.lineales = await node('mate', 'Funciones lineales', nodes.funciones, 2, 9, 75, 340)
  nodes.cuadraticas = await node('mate', 'Funciones cuadráticas', nodes.funciones, 6, 4, 225, 340)
  nodes.vertice = await node('mate', 'Vértice y raíces', nodes.cuadraticas, 7, 3, 225, 510)
  nodes.limites = await node('mate', 'Límites', nodes.mateRoot, 8, 2, 375, 170)
  nodes.derivadas = await node('mate', 'Derivadas', nodes.mateRoot, 9, 1, 525, 170)

  nodes.lenguaRoot = await node('lengua', 'Lengua', null, null, null, 1000, 0)
  nodes.literatura = await node('lengua', 'Literatura latinoamericana', nodes.lenguaRoot, 5, 6, 925, 170)
  nodes.cortazar = await node('lengua', 'Cortázar', nodes.literatura, 6, 5, 925, 340)
  nodes.argumentacion = await node('lengua', 'Argumentación', nodes.lenguaRoot, 4, 7, 1075, 170)

  await db.query(
    `insert into public.node_links (user_id, source_node_id, target_node_id, label)
     values ($1, $2, $3, 'redactar demostraciones')`,
    [id, nodes.argumentacion, nodes.lineales],
  )

  const tasks = [
    ['lengua', 'Ensayo sobre Cortázar', 'task', 'pending', at(0, '23:59'), null],
    ['mate', 'TP Integral de funciones', 'project', 'waiting', at(2, '23:59'), null],
    ['bio', 'Resumen de genética', 'task', 'pending', at(-1, '23:59'), null],
    ['historia', 'Lectura del capítulo 3', 'task', 'pending', at(5, '18:00'), null],
    ['ingles', 'Vocabulario unidad 4', 'task', 'done', at(-3, '23:59'), at(-3, '20:00')],
    ['mate', 'Guía de ejercicios 5', 'task', 'pending', at(9, '23:59'), null],
  ]

  for (const [subject, title, kind, status, dueAt, completedAt] of tasks) {
    await db.query(
      `insert into public.tasks (user_id, subject_id, title, kind, status, due_at, completed_at)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [id, subjects[subject], title, kind, status, dueAt, completedAt],
    )
  }

  const examDay = 6
  const exam = (
    await db.query(
      `insert into public.exams (user_id, subject_id, title, exam_at, duration_minutes, location,
         study_days_before, study_frequency_days, study_session_minutes, study_time)
       values ($1, $2, 'Parcial 1: funciones', $3, 90, 'Aula 12', 5, 1, 45, '18:00') returning id`,
      [id, subjects.mate, at(examDay, '08:00')],
    )
  ).rows[0].id

  for (let day = examDay - 5; day < examDay; day += 1) {
    const scheduledAt = at(day, '18:00')

    if (Date.parse(scheduledAt) > Date.now()) {
      await db.query(
        `insert into public.study_sessions (user_id, exam_id, scheduled_at, duration_minutes)
         values ($1, $2, $3, 45)`,
        [id, exam, scheduledAt],
      )
    }
  }

  await db.query(
    `insert into public.exams (user_id, subject_id, title, exam_at, duration_minutes)
     values ($1, $2, 'Oral de inglés', $3, 20)`,
    [id, subjects.ingles, at(12, '10:00')],
  )

  const schedule = [
    ['mate', 'class', [1, 3], '08:00', '09:30', 'Aula 12'],
    ['lengua', 'class', [1, 5], '10:00', '11:30', 'Aula 8'],
    ['ingles', 'class', [2], '08:00', '09:30', 'Laboratorio de idiomas'],
    ['historia', 'class', [2, 4], '10:00', '11:30', 'Aula 8'],
    ['bio', 'class', [3], '10:00', '11:30', 'Laboratorio'],
    ['bio', 'class', [5], '08:00', '09:30', 'Aula 3'],
    [null, 'break', [1, 2, 3, 4, 5], '09:30', '10:00', null, 'Recreo'],
    [null, 'activity', [2, 4], '17:00', '18:30', 'Club del barrio', 'Fútbol'],
  ]

  for (const [subject, type, days, start, end, location, title] of schedule) {
    for (const weekday of days) {
      await db.query(
        `insert into public.schedule_entries (user_id, academic_year_id, subject_id, title, entry_type,
           weekday, starts_at, ends_at, location)
         values ($1, $2, $3, coalesce($4, (select name from public.subjects where id = $3)), $5, $6, $7, $8, $9)`,
        [id, year, subject ? subjects[subject] : null, title ?? null, type, weekday, start, end, location],
      )
    }
  }

  const assessments = [
    ['mate', 'Parcial 1', 7, 30, localDate(-40), 'funciones'],
    ['mate', 'TP grupal', 8.5, 20, localDate(-20), 'lineales'],
    ['mate', 'Parcial 2', null, 25, localDate(examDay)],
    ['mate', 'Final', null, 25, null],
    ['lengua', 'Ensayo 1', 4, 40, localDate(-15), 'cortazar'],
    ['lengua', 'Oral', null, 60, localDate(20)],
    ['ingles', 'Writing', 9, 50, localDate(-30)],
    ['ingles', 'Listening', 8, 50, localDate(-10)],
  ]

  for (const [subject, title, score, weight, assessedOn, nodeKey] of assessments) {
    await db.query(
      `insert into public.assessments (user_id, subject_id, title, score, scale_min, scale_max, weight, assessed_on, node_id)
       values ($1, $2, $3, $4, 1, 10, $5, $6, $7)`,
      [id, subjects[subject], title, score, weight, assessedOn, nodeKey ? nodes[nodeKey] : null],
    )
  }

  await db.query(`update public.tasks set node_id = $1 where title = 'TP Integral de funciones'`, [nodes.funciones])
  await db.query(`update public.exams set node_id = $1 where title = 'Parcial 1: funciones'`, [nodes.funciones])

  // Biblioteca: enlaces y archivos de ejemplo (los archivos los carga server.mjs en su Storage).
  const taskId = (await db.query(`select id from public.tasks where title = 'TP Integral de funciones'`)).rows[0].id
  const librarySources = [
    ['mate', nodes.lineales, taskId, 'Funciones lineales paso a paso', 'link', 'https://es.khanacademy.org/math/algebra', null, null, null, ['teoría', 'ejercicios']],
    ['mate', nodes.limites, null, 'Clase grabada: límites', 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', null, null, null, ['parcial 2']],
    ['mate', nodes.funciones, null, 'Pizarrón de la clase de funciones', 'image', null, 'pizarron.png', 1250000, 'image/png', ['clase']],
    ['lengua', nodes.cortazar, null, 'Cuentos completos de Cortázar', 'book', null, 'cuentos-cortazar.pdf', 3400000, 'application/pdf', ['lectura']],
    ['lengua', null, null, 'Rayuela (artículo)', 'link', 'https://es.wikipedia.org/wiki/Rayuela', null, null, null, []],
  ]

  for (const [subject, nodeId, sourceTaskId, title, type, url, fileName, size, mime, tags] of librarySources) {
    const sourceId = (await db.query('select gen_random_uuid() as id')).rows[0].id
    const storagePath = fileName ? `${id}/${sourceId}/${fileName}` : null
    await db.query(
      `insert into public.sources (id, user_id, subject_id, node_id, task_id, title, source_type, external_url,
         storage_path, thumbnail_path, size_bytes, mime_type, tags)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text[])`,
      [sourceId, id, subjects[subject], nodeId, sourceTaskId, title, type, url, storagePath,
        mime?.startsWith('image/') ? `${id}/${sourceId}/miniatura.jpg` : null, size, mime,
        `{${tags.map((tag) => `"${tag}"`).join(',')}}`],
    )
  }

  return new Map([[email, { id, password }]])
}
