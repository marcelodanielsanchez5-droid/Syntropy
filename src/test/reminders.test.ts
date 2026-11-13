import { describe, expect, it, vi } from 'vitest'
import {
  buildReminderEmail,
  calendarDaysBetween,
  describeWhen,
  escapeHtml,
  formatDuration,
  safeTimeZone,
  type ClaimedReminder,
} from '../../supabase/functions/send-reminders/email.ts'
import {
  RESEND_ENDPOINT,
  handleRequest,
  runReminders,
  safeEqual,
  type FunctionConfig,
} from '../../supabase/functions/send-reminders/handler.ts'
import {
  DEFAULT_REMINDER_PREFERENCES,
  canCancel,
  canReschedule,
  canRestore,
  groupReminders,
  hasNoKinds,
  leadLabel,
  leadOptionsWith,
  reminderTitle,
  validateReschedule,
} from '@/features/reminders/reminder-rules'
import type { Reminder } from '@/types/database'

const TZ = 'America/Argentina/Buenos_Aires' // UTC-3, sin horario de verano
// Viernes 13 de noviembre de 2026, 11:00 en Buenos Aires.
const NOW = new Date('2026-11-13T14:00:00Z')

function claimed(overrides: Partial<ClaimedReminder> = {}): ClaimedReminder {
  return {
    reminder_id: '00000000-0000-4000-8000-000000000001',
    kind: 'task_due',
    recipient: 'martina@example.com',
    subject: 'Tarea: TP 1',
    body: null,
    send_at: '2026-11-13T14:00:00Z',
    event_at: '2026-11-15T02:59:00Z', // sábado 14, 23:59 en Buenos Aires
    attempts: 1,
    time_zone: TZ,
    display_name: 'Martina',
    item_title: 'TP 1',
    item_kind: 'task',
    subject_id: 'subject-1',
    subject_name: 'Física',
    subject_color: '#3366FF',
    location: null,
    duration_minutes: null,
    ...overrides,
  }
}

function reminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'r1',
    user_id: 'u1',
    kind: 'task_due',
    task_id: 't1',
    exam_id: null,
    study_session_id: null,
    send_at: '2026-11-14T02:59:00Z',
    event_at: '2026-11-15T02:59:00Z',
    recipient: 'martina@example.com',
    subject: 'Tarea: TP 1',
    body: null,
    status: 'scheduled',
    provider_message_id: null,
    sent_at: null,
    error_message: null,
    attempts: 0,
    locked_until: null,
    created_at: '2026-11-10T12:00:00Z',
    updated_at: '2026-11-10T12:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Fechas del correo
// ---------------------------------------------------------------------------

describe('fechas del correo en la zona del usuario', () => {
  it('dice hoy, mañana, el día de la semana o la fecha completa', () => {
    expect(describeWhen(new Date('2026-11-13T21:00:00Z'), NOW, TZ)).toBe('hoy a las 18:00')
    expect(describeWhen(new Date('2026-11-15T02:59:00Z'), NOW, TZ)).toBe('mañana a las 23:59')
    expect(describeWhen(new Date('2026-11-18T11:00:00Z'), NOW, TZ)).toBe('el miércoles a las 08:00')
    expect(describeWhen(new Date('2026-11-24T13:00:00Z'), NOW, TZ)).toBe(
      'el martes 24 de noviembre a las 10:00',
    )
  })

  it('cuenta los días en la zona del usuario, no en UTC', () => {
    // 23:30 del viernes en Buenos Aires (ya es sábado en UTC).
    const lateFriday = new Date('2026-11-14T02:30:00Z')
    const saturdayOneAm = new Date('2026-11-14T04:00:00Z')

    expect(calendarDaysBetween(lateFriday, saturdayOneAm, TZ)).toBe(1)
    expect(calendarDaysBetween(lateFriday, saturdayOneAm, 'UTC')).toBe(0)
    expect(describeWhen(saturdayOneAm, lateFriday, TZ)).toBe('mañana a la 01:00')
  })

  it('usa UTC si la zona del perfil no es válida', () => {
    expect(safeTimeZone('Marte/Base_Alfa')).toBe('UTC')
    expect(safeTimeZone(null)).toBe('UTC')
    expect(safeTimeZone(TZ)).toBe(TZ)
  })

  it('formatea duraciones', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(120)).toBe('2 h')
    expect(formatDuration(90)).toBe('1 h 30 min')
  })
})

// ---------------------------------------------------------------------------
// Contenido del correo
// ---------------------------------------------------------------------------

describe('correo de cada recordatorio', () => {
  const appUrl = 'https://syntropy.example.com/'

  it('tarea: asunto con la fecha relativa, detalle y enlace a la asignatura', () => {
    const email = buildReminderEmail(claimed(), { appUrl, now: NOW })

    expect(email.subject).toBe('Tarea «TP 1» vence mañana a las 23:59')
    expect(email.text).toContain('Hola, Martina:')
    expect(email.text).toContain('Tu tarea vence mañana a las 23:59.')
    expect(email.text).toContain('Asignatura: Física')
    expect(email.text).toContain('Vence: sábado 14 de noviembre, 23:59')
    expect(email.text).toContain('https://syntropy.example.com/asignaturas/subject-1/calendario')
    expect(email.html).toContain(
      'href="https://syntropy.example.com/asignaturas/subject-1/calendario"',
    )
    expect(email.html).toContain('border-left:4px solid #3366FF')
    expect(email.html).toContain('https://syntropy.example.com/configuracion#recordatorios')
  })

  it('proyecto: lo nombra como proyecto', () => {
    const email = buildReminderEmail(claimed({ item_kind: 'project', item_title: 'Maqueta' }), {
      now: NOW,
    })

    expect(email.subject).toBe('Proyecto «Maqueta» vence mañana a las 23:59')
    expect(email.text).toContain('Tu proyecto vence')
  })

  it('examen: incluye lugar y duración', () => {
    const email = buildReminderEmail(
      claimed({
        kind: 'exam',
        item_title: 'Parcial 1',
        item_kind: null,
        event_at: '2026-11-18T11:00:00Z',
        location: 'Aula 3',
        duration_minutes: 120,
      }),
      { now: NOW },
    )

    expect(email.subject).toBe('Examen el miércoles a las 08:00: Parcial 1')
    expect(email.text).toContain('Tenés un examen el miércoles a las 08:00.')
    expect(email.text).toContain('Lugar: Aula 3')
    expect(email.text).toContain('Duración: 2 h')
  })

  it('sesión de estudio: nombra el examen y la duración', () => {
    const email = buildReminderEmail(
      claimed({
        kind: 'study_session',
        item_title: 'Parcial 1',
        item_kind: null,
        event_at: '2026-11-13T21:00:00Z',
        duration_minutes: 45,
      }),
      { now: NOW },
    )

    expect(email.subject).toBe('Sesión de estudio hoy a las 18:00: Parcial 1')
    expect(email.text).toContain('Para: Parcial 1')
    expect(email.text).toContain('Duración: 45 min')
  })

  it('personalizado: usa el asunto y el texto guardados', () => {
    const email = buildReminderEmail(
      claimed({
        kind: 'custom',
        subject: 'Correo de prueba de Syntropy',
        body: 'Si te llegó este correo, funciona.',
        event_at: null,
        item_title: null,
      }),
      { now: NOW },
    )

    expect(email.subject).toBe('Correo de prueba de Syntropy')
    expect(email.text).toContain('Si te llegó este correo, funciona.')
  })

  it('escapa el HTML que viene de los títulos del usuario', () => {
    const email = buildReminderEmail(
      claimed({ item_title: '<img src=x onerror=alert(1)>', subject_name: 'Física & "Química"' }),
      { now: NOW },
    )

    expect(email.html).not.toContain('<img src=x')
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(email.html).toContain('Física &amp; &quot;Química&quot;')
    expect(escapeHtml(`'`)).toBe('&#39;')
  })

  it('sin URL de la app no pone enlaces, y un color inválido no entra al HTML', () => {
    const email = buildReminderEmail(claimed({ subject_color: 'red;background:url(x)' }), {
      now: NOW,
    })

    expect(email.html).not.toContain('href=')
    expect(email.html).not.toContain('url(x)')
    expect(email.text).not.toContain('http')
  })

  it('el asunto no pasa de 200 caracteres ni tiene saltos de línea', () => {
    const email = buildReminderEmail(claimed({ item_title: `Título\n${'x'.repeat(190)}` }), {
      now: NOW,
    })

    expect(email.subject.length).toBeLessThanOrEqual(200)
    expect(email.subject).not.toContain('\n')
    expect(email.subject.endsWith('…')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Edge Function
// ---------------------------------------------------------------------------

interface FakeCall {
  url: string
  init: RequestInit
}

function fakeBackend(
  rows: ClaimedReminder[],
  resend: (call: FakeCall) => Response | Promise<Response>,
) {
  const calls: FakeCall[] = []
  const finished: Array<Record<string, unknown>> = []

  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input)
    const call = { url, init }
    calls.push(call)

    if (url.endsWith('/rest/v1/rpc/claim_due_reminders')) {
      return new Response(JSON.stringify(rows), { status: 200 })
    }

    if (url.endsWith('/rest/v1/rpc/finish_reminder')) {
      finished.push(JSON.parse(String(init.body)))
      return new Response(null, { status: 204 })
    }

    if (url === RESEND_ENDPOINT) {
      return resend(call)
    }

    throw new Error(`URL inesperada: ${url}`)
  })

  const config: FunctionConfig = {
    supabaseUrl: 'https://proyecto.supabase.co',
    serviceKey: 'sb_secret_prueba',
    resendApiKey: 're_prueba',
    fromEmail: 'Syntropy <recordatorios@example.com>',
    cronSecret: 'secreto-largo',
    appUrl: 'https://syntropy.example.com',
    fetch: fetchImpl as unknown as typeof fetch,
    now: () => NOW,
    sleep: async () => {},
  }

  return { calls, finished, config }
}

const ok = (id: string) => new Response(JSON.stringify({ id }), { status: 200 })

describe('función send-reminders', () => {
  it('envía con Resend y registra cada resultado', async () => {
    const rows = [
      claimed({ reminder_id: 'a' }),
      claimed({ reminder_id: 'b', recipient: 'rebota@example.com' }),
      claimed({ reminder_id: 'c' }),
    ]
    const { calls, finished, config } = fakeBackend(rows, ({ init }) => {
      const body = JSON.parse(String(init.body)) as { to: string[] }

      if (body.to[0].startsWith('rebota')) {
        return new Response(JSON.stringify({ message: 'Invalid `to` field.' }), { status: 422 })
      }

      const key = (init.headers as Record<string, string>)['Idempotency-Key']
      return key.endsWith('/c') ? new Response('fallo', { status: 503 }) : ok('re_123')
    })

    const summary = await runReminders(config)

    expect(summary).toEqual({ claimed: 3, sent: 1, retried: 1, failed: 1, released: 0 })
    expect(finished).toEqual([
      expect.objectContaining({
        p_reminder_id: 'a',
        p_outcome: 'sent',
        p_provider_message_id: 're_123',
        p_recipient: 'martina@example.com',
        p_subject: 'Tarea «TP 1» vence mañana a las 23:59',
      }),
      expect.objectContaining({
        p_reminder_id: 'b',
        p_outcome: 'failed',
        p_error: 'Resend 422: Invalid `to` field.',
      }),
      expect.objectContaining({
        p_reminder_id: 'c',
        p_outcome: 'retry',
        p_error: 'Resend 503: fallo',
      }),
    ])

    const first = calls.find((call) => call.url === RESEND_ENDPOINT)
    const headers = first?.init.headers as Record<string, string>
    const body = JSON.parse(String(first?.init.body))
    expect(headers.Authorization).toBe('Bearer re_prueba')
    expect(headers['Idempotency-Key']).toBe('syntropy-reminder/a')
    expect(body).toMatchObject({
      from: 'Syntropy <recordatorios@example.com>',
      to: ['martina@example.com'],
      tags: [{ name: 'kind', value: 'task_due' }],
    })
  })

  it('si Resend pide esperar, devuelve el resto a la cola sin gastar intentos', async () => {
    const rows = [
      claimed({ reminder_id: 'a' }),
      claimed({ reminder_id: 'b' }),
      claimed({ reminder_id: 'c' }),
    ]
    const { finished, config } = fakeBackend(rows, () => new Response('{}', { status: 429 }))

    const summary = await runReminders(config)

    expect(summary).toMatchObject({ retried: 1, released: 2, sent: 0 })
    expect(finished.map((call) => call.p_outcome)).toEqual(['retry', 'release', 'release'])
  })

  it('sin dirección no llama a Resend; sin conexión, reintenta', async () => {
    const rows = [claimed({ reminder_id: 'a', recipient: null }), claimed({ reminder_id: 'b' })]
    const { calls, finished, config } = fakeBackend(rows, () => {
      throw new TypeError('fetch failed')
    })

    await runReminders(config)

    expect(calls.filter((call) => call.url === RESEND_ENDPOINT)).toHaveLength(1)
    expect(finished).toEqual([
      expect.objectContaining({ p_reminder_id: 'a', p_outcome: 'failed' }),
      expect.objectContaining({ p_reminder_id: 'b', p_outcome: 'retry' }),
    ])
  })

  it('usa la clave de servicio como corresponde a su tipo', async () => {
    const secret = fakeBackend([], () => ok('x'))
    await runReminders(secret.config)
    const secretHeaders = secret.calls[0].init.headers as Record<string, string>
    expect(secretHeaders.apikey).toBe('sb_secret_prueba')
    expect(secretHeaders.Authorization).toBeUndefined()

    const legacy = fakeBackend([], () => ok('x'))
    await runReminders({ ...legacy.config, serviceKey: 'eyJhbGciOi.prueba.firma' })
    const legacyHeaders = legacy.calls[0].init.headers as Record<string, string>
    expect(legacyHeaders.Authorization).toBe('Bearer eyJhbGciOi.prueba.firma')
  })

  it('solo responde a POST con el secreto de la tarea programada', async () => {
    const { config } = fakeBackend([], () => ok('x'))
    const request = (method: string, secret?: string) =>
      new Request('https://proyecto.supabase.co/functions/v1/send-reminders', {
        method,
        headers: secret ? { 'x-cron-secret': secret } : {},
      })

    expect((await handleRequest(request('GET', 'secreto-largo'), config)).status).toBe(405)
    expect((await handleRequest(request('POST'), config)).status).toBe(401)
    expect((await handleRequest(request('POST', 'otro'), config)).status).toBe(401)

    const okResponse = await handleRequest(request('POST', 'secreto-largo'), config)
    expect(okResponse.status).toBe(200)
    expect(await okResponse.json()).toEqual({
      claimed: 0,
      sent: 0,
      retried: 0,
      failed: 0,
      released: 0,
    })

    const missing = await handleRequest(request('POST', 'secreto-largo'), {
      ...config,
      resendApiKey: '',
    })
    expect(missing.status).toBe(500)
    expect(await missing.json()).toEqual({
      error: 'Faltan secretos de la función: RESEND_API_KEY.',
    })
  })

  it('compara el secreto sin cortar en el primer carácter distinto', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
    expect(safeEqual('', '')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Reglas de la pantalla
// ---------------------------------------------------------------------------

describe('reglas de los recordatorios en Configuración', () => {
  it('nombra la anticipación', () => {
    expect(leadLabel(1440)).toBe('1 día antes')
    expect(leadLabel(4320)).toBe('3 días antes')
    expect(leadLabel(120)).toBe('2 horas antes')
    expect(leadLabel(1)).toBe('1 minuto antes')
    expect(leadLabel(0)).toBe('En el momento')
  })

  it('agrega al selector una anticipación que no es de las habituales', () => {
    expect(leadOptionsWith(1440)).toHaveLength(7)
    const options = leadOptionsWith(90)
    expect(options).toHaveLength(8)
    expect(options[2]).toEqual({ minutes: 90, label: '90 minutos antes' })
  })

  it('quita el prefijo del tipo en el título', () => {
    expect(reminderTitle({ kind: 'task_due', subject: 'Tarea: TP 1' })).toBe('TP 1')
    expect(reminderTitle({ kind: 'study_session', subject: 'Sesión de estudio: Parcial' })).toBe(
      'Parcial',
    )
    expect(reminderTitle({ kind: 'task_due', subject: 'Tarea «TP 1» vence hoy' })).toBe(
      'Tarea «TP 1» vence hoy',
    )
  })

  it('decide qué acciones se ofrecen', () => {
    expect(canCancel(reminder())).toBe(true)
    expect(canCancel(reminder({ status: 'sent' }))).toBe(false)

    expect(canRestore(reminder({ status: 'cancelled' }), NOW)).toBe(true)
    expect(
      canRestore(reminder({ status: 'cancelled', send_at: '2026-11-13T13:00:00Z' }), NOW),
    ).toBe(false)

    expect(canReschedule(reminder({ status: 'cancelled' }), NOW)).toBe(true)
    expect(canReschedule(reminder({ status: 'sent' }), NOW)).toBe(false)
    expect(canReschedule(reminder({ event_at: '2026-11-13T14:01:00Z' }), NOW)).toBe(false)
    expect(canReschedule(reminder({ kind: 'custom', event_at: null }), NOW)).toBe(true)
  })

  it('valida la hora nueva como la base', () => {
    const target = reminder()
    expect(validateReschedule(new Date('2026-11-13T14:00:30Z'), target, NOW)).toBe(
      'Elegí una hora futura.',
    )
    expect(validateReschedule(new Date('2026-11-16T00:00:00Z'), target, NOW)).toBe(
      'El aviso tiene que llegar antes del evento.',
    )
    expect(validateReschedule(new Date('2026-11-14T12:00:00Z'), target, NOW)).toBeNull()
    expect(validateReschedule(new Date('x'), target, NOW)).toBe('Elegí una fecha y una hora.')
  })

  it('separa próximos e historial', () => {
    const groups = groupReminders(
      [
        reminder({
          id: 'later',
          send_at: '2026-11-20T10:00:00Z',
          event_at: '2026-11-21T10:00:00Z',
        }),
        reminder({ id: 'soon' }),
        reminder({ id: 'sent', status: 'sent', sent_at: '2026-11-12T10:00:00Z' }),
        reminder({ id: 'failed', status: 'failed', updated_at: '2026-11-13T10:00:00Z' }),
        reminder({ id: 'old-cancelled', status: 'cancelled', event_at: '2026-11-12T10:00:00Z' }),
        reminder({ id: 'cancelled', status: 'cancelled' }),
      ],
      NOW,
    )

    expect(groups.upcoming.map((item) => item.id)).toEqual(['soon', 'cancelled', 'later'])
    expect(groups.history.map((item) => item.id)).toEqual(['failed', 'sent', 'old-cancelled'])
  })

  it('avisa si se activaron sin ningún tipo', () => {
    expect(hasNoKinds(DEFAULT_REMINDER_PREFERENCES)).toBe(false)
    expect(
      hasNoKinds({
        ...DEFAULT_REMINDER_PREFERENCES,
        email_reminders_enabled: true,
        remind_tasks: false,
        remind_exams: false,
      }),
    ).toBe(true)
  })
})
