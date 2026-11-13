import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { buildCalendarEvents } from '@/features/calendar/calendar-events'
import { getNextDueBySubject, getUpcomingItems } from '@/features/calendar/upcoming'
import { TaskPanel } from '@/features/tasks/TaskPanel'
import { zonedToUtcIso } from '@/lib/datetime'
import type { Exam, StudySession, Subject, Task } from '@/types/database'

const TZ = 'America/Argentina/Buenos_Aires'
// Jueves 12 de noviembre de 2026, 10:00 en Buenos Aires.
const NOW = new Date('2026-11-12T13:00:00.000Z')

const subjects: Subject[] = [
  { id: 'mate', name: 'Matemática', color_hex: '#2F6BFF' },
  { id: 'lengua', name: 'Lengua', color_hex: '#E01462' },
].map((subject) => ({
  user_id: 'user-1',
  academic_year_id: 'year-1',
  description: null,
  teacher_names: [],
  notes: null,
  evaluation_criteria: null,
  methodology: null,
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  ...subject,
}))
const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]))

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    user_id: 'user-1',
    subject_id: 'mate',
    node_id: null,
    title: id,
    description: null,
    kind: 'task',
    status: 'pending',
    color_hex: null,
    due_at: zonedToUtcIso('2026-11-14', '23:59', TZ),
    completed_at: null,
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

const exam: Exam = {
  id: 'parcial',
  user_id: 'user-1',
  subject_id: 'mate',
  node_id: null,
  title: 'Parcial',
  description: null,
  exam_at: zonedToUtcIso('2026-11-16', '08:00', TZ),
  duration_minutes: 90,
  location: null,
  study_days_before: 2,
  study_frequency_days: 1,
  study_session_minutes: 45,
  study_time: '18:00:00',
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

const session: StudySession = {
  id: 'sesion-1',
  user_id: 'user-1',
  exam_id: 'parcial',
  scheduled_at: zonedToUtcIso('2026-11-15', '18:00', TZ),
  duration_minutes: 45,
  status: 'scheduled',
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

describe('eventos del calendario', () => {
  const tasks = [
    task('ensayo', { color_hex: '#12B886' }),
    task('atrasada', { due_at: zonedToUtcIso('2026-11-10', '23:59', TZ) }),
  ]

  it('en el calendario general: fechas límite y exámenes, sin sesiones de estudio', () => {
    const events = buildCalendarEvents({
      tasks,
      exams: [exam],
      sessions: [session],
      subjectsById,
      mode: 'general',
      timeZone: TZ,
      now: NOW,
    })
    const ensayo = events.find((event) => event.id === 'task:ensayo')

    expect(events.map((event) => event.extendedProps.kind).sort()).toEqual(['exam', 'task', 'task'])
    // Un solo día, con el color de la asignatura aunque la tarea tenga uno propio.
    expect(ensayo).toMatchObject({ start: '2026-11-14', end: '2026-11-15', allDay: true })
    expect(ensayo?.extendedProps.color).toBe('#2F6BFF')
  })

  it('en el calendario de la asignatura: días pintados hasta la entrega y sesiones', () => {
    const events = buildCalendarEvents({
      tasks,
      exams: [exam],
      sessions: [session],
      subjectsById,
      mode: 'subject',
      timeZone: TZ,
      now: NOW,
    })
    const ensayo = events.find((event) => event.id === 'task:ensayo')
    const atrasada = events.find((event) => event.id === 'task:atrasada')
    const estudio = events.find((event) => event.id === 'session:sesion-1')

    expect(ensayo).toMatchObject({ start: '2026-11-12', end: '2026-11-15' })
    expect(ensayo?.extendedProps).toMatchObject({ kind: 'task-range', color: '#12B886' })
    // Lo atrasado no se pinta hacia atrás: queda en su día, marcado.
    expect(atrasada).toMatchObject({ start: '2026-11-10' })
    expect(atrasada?.extendedProps).toMatchObject({ kind: 'task', overdue: true })
    expect(estudio).toMatchObject({
      start: '2026-11-15T18:00:00',
      end: '2026-11-15T18:45:00',
      allDay: false,
    })
  })

  it('cada evento tiene una descripción en texto, no solo color', () => {
    const [event] = buildCalendarEvents({
      tasks: [tasks[1]],
      exams: [],
      sessions: [],
      subjectsById,
      mode: 'general',
      timeZone: TZ,
      now: NOW,
    })

    expect(event.extendedProps.description).toBe(
      'Tarea: atrasada · Matemática · Atrasada · Venció hace 2 días',
    )
  })

  it('el examen ocupa su horario en la zona del perfil', () => {
    const [event] = buildCalendarEvents({
      tasks: [],
      exams: [exam],
      sessions: [],
      subjectsById,
      mode: 'general',
      timeZone: TZ,
      now: NOW,
    })

    expect(event).toMatchObject({ start: '2026-11-16T08:00:00', end: '2026-11-16T09:30:00' })
  })
})

describe('próximos vencimientos (campana)', () => {
  it('incluye lo atrasado y lo de los próximos 7 días, ordenado por fecha', () => {
    const items = getUpcomingItems({
      tasks: [
        task('lejana', { due_at: zonedToUtcIso('2026-11-30', '23:59', TZ) }),
        task('pronto', { subject_id: 'lengua' }),
        task('atrasada', { due_at: zonedToUtcIso('2026-11-10', '23:59', TZ) }),
        task('terminada', { status: 'done', completed_at: NOW.toISOString() }),
      ],
      exams: [exam],
      subjectsById,
      timeZone: TZ,
      now: NOW,
    })

    expect(items.map((item) => item.key)).toEqual(['task:atrasada', 'task:pronto', 'exam:parcial'])
    expect(items[0]).toMatchObject({ overdue: true, label: 'Atrasada' })
    expect(items[2]).toMatchObject({ kindLabel: 'Examen', label: 'En 4 días' })
  })

  it('el próximo vencimiento de cada materia ignora lo atrasado', () => {
    const items = getUpcomingItems({
      tasks: [
        task('atrasada', { due_at: zonedToUtcIso('2026-11-10', '23:59', TZ) }),
        task('pronto'),
      ],
      exams: [],
      subjectsById,
      timeZone: TZ,
      now: NOW,
    })

    expect(getNextDueBySubject(items).get('mate')?.id).toBe('pronto')
  })
})

describe('panel de tareas', () => {
  function renderPanel(
    onStatusFilterChange = vi.fn(),
    statusFilter: 'all' | 'pending' | 'waiting' | 'done' = 'all',
  ) {
    const onStatusChange = vi.fn()
    const onOpen = vi.fn()

    render(
      <TaskPanel
        tasks={[
          task('Ensayo'),
          task('TP', { status: 'waiting' }),
          task('Resumen', { status: 'done', completed_at: NOW.toISOString() }),
        ]}
        subjectsById={subjectsById}
        mode="general"
        timeZone={TZ}
        now={NOW}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        onCreate={vi.fn()}
        onOpen={onOpen}
        onStatusChange={onStatusChange}
      />,
    )

    return { onStatusChange, onOpen }
  }

  it('muestra cada filtro con su cantidad', () => {
    renderPanel()
    const filters = screen.getByRole('radiogroup', { name: 'Filtrar tareas por estado' })

    expect(within(filters).getByRole('radio', { name: /Todas\s*3/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(within(filters).getByRole('radio', { name: /En espera\s*1/ })).toBeInTheDocument()
  })

  it('filtra por estado', () => {
    renderPanel(vi.fn(), 'waiting')

    expect(screen.getByRole('button', { name: 'Abrir tarea TP' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir tarea Ensayo' })).not.toBeInTheDocument()
  })

  it('avisa el cambio de filtro y de estado', () => {
    const onFilter = vi.fn()
    const { onStatusChange, onOpen } = renderPanel(onFilter)

    fireEvent.click(screen.getByRole('radio', { name: /Terminadas/ }))
    expect(onFilter).toHaveBeenCalledWith('done')

    fireEvent.change(screen.getByLabelText('Cambiar estado de Ensayo'), {
      target: { value: 'done' },
    })
    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'Ensayo' }), 'done')

    fireEvent.click(screen.getByRole('button', { name: 'Abrir tarea Ensayo' }))
    expect(onOpen).toHaveBeenCalled()
  })

  it('el estado se lee como texto y la cuenta regresiva también', () => {
    renderPanel()

    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Vence en 2 días')).toHaveLength(2)
  })

  it('con un filtro vacío ofrece volver a ver todas', () => {
    const onFilter = vi.fn()

    render(
      <TaskPanel
        tasks={[task('Ensayo')]}
        subjectsById={subjectsById}
        mode="general"
        timeZone={TZ}
        now={NOW}
        statusFilter="done"
        onStatusFilterChange={onFilter}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ver todas' }))
    expect(onFilter).toHaveBeenCalledWith('all')
  })
})
