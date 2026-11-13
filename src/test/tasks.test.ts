import { describe, expect, it } from 'vitest'
import { taskFormSchema } from '@/features/tasks/task-schemas'
import {
  countTasksByStatus,
  emptyTaskFormValues,
  filterTasks,
  getTaskDueState,
  resolveTaskColor,
  sortTasks,
  statusPatch,
  taskToFormValues,
  toTaskPayload,
} from '@/features/tasks/task-utils'
import { zonedToUtcIso } from '@/lib/datetime'
import type { Task } from '@/types/database'

const TZ = 'America/Argentina/Buenos_Aires'
// Jueves 12 de noviembre de 2026, 10:00 en Buenos Aires.
const NOW = new Date('2026-11-12T13:00:00.000Z')

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    subject_id: 'subject-1',
    node_id: null,
    title: 'Ensayo',
    description: null,
    kind: 'task',
    status: 'pending',
    color_hex: null,
    due_at: zonedToUtcIso('2026-11-14', '23:59', TZ),
    completed_at: null,
    created_at: '2026-11-01T12:00:00.000Z',
    updated_at: '2026-11-01T12:00:00.000Z',
    ...overrides,
  }
}

const validForm = {
  title: '  Ensayo de Lengua  ',
  description: '  Dos carillas.  ',
  subject_id: 'subject-1',
  kind: 'task' as const,
  status: 'pending' as const,
  due_date: '2026-11-14',
  due_time: '18:30',
  color_hex: '',
  node_id: '',
}

describe('taskFormSchema', () => {
  it('acepta una tarea válida y recorta los textos', () => {
    const result = taskFormSchema.safeParse(validForm)

    expect(result.success).toBe(true)
    expect(result.data?.title).toBe('Ensayo de Lengua')
    expect(result.data?.description).toBe('Dos carillas.')
  })

  it('exige título, asignatura y fecha límite', () => {
    const result = taskFormSchema.safeParse({
      ...validForm,
      title: '   ',
      subject_id: '',
      due_date: '',
    })
    const paths = result.error?.issues.map((issue) => issue.path[0])

    expect(result.success).toBe(false)
    expect(paths).toEqual(expect.arrayContaining(['title', 'subject_id', 'due_date']))
  })

  it('rechaza fechas imposibles, horas inválidas y colores que no son hexadecimales', () => {
    expect(taskFormSchema.safeParse({ ...validForm, due_date: '2026-02-30' }).success).toBe(false)
    expect(taskFormSchema.safeParse({ ...validForm, due_time: '25:00' }).success).toBe(false)
    expect(taskFormSchema.safeParse({ ...validForm, color_hex: 'rojo' }).success).toBe(false)
    expect(taskFormSchema.safeParse({ ...validForm, color_hex: '#2F6BFF' }).success).toBe(true)
  })

  it('limita el título a los 160 caracteres de la base', () => {
    expect(taskFormSchema.safeParse({ ...validForm, title: 'a'.repeat(160) }).success).toBe(true)
    expect(taskFormSchema.safeParse({ ...validForm, title: 'a'.repeat(161) }).success).toBe(false)
  })

  it('solo admite los tipos y estados definidos', () => {
    expect(taskFormSchema.safeParse({ ...validForm, kind: 'project' }).success).toBe(true)
    expect(taskFormSchema.safeParse({ ...validForm, kind: 'examen' }).success).toBe(false)
    expect(taskFormSchema.safeParse({ ...validForm, status: 'cancelada' }).success).toBe(false)
  })
})

describe('getTaskDueState', () => {
  const options = { timeZone: TZ, now: NOW }

  it('vence hoy', () => {
    const state = getTaskDueState(
      makeTask({ due_at: zonedToUtcIso('2026-11-12', '23:59', TZ) }),
      options,
    )

    expect(state).toMatchObject({ kind: 'today', label: 'Hoy', sentence: 'Vence hoy' })
  })

  it('vence mañana', () => {
    const state = getTaskDueState(
      makeTask({ due_at: zonedToUtcIso('2026-11-13', '08:00', TZ) }),
      options,
    )

    expect(state).toMatchObject({ kind: 'tomorrow', label: 'Mañana', sentence: 'Vence mañana' })
  })

  it('vence en varios días', () => {
    const state = getTaskDueState(
      makeTask({ due_at: zonedToUtcIso('2026-11-14', '23:59', TZ) }),
      options,
    )

    expect(state).toMatchObject({
      kind: 'upcoming',
      days: 2,
      label: 'En 2 días',
      sentence: 'Vence en 2 días',
    })
  })

  it('está atrasada si la hora ya pasó, aunque sea hoy', () => {
    const state = getTaskDueState(
      makeTask({ due_at: zonedToUtcIso('2026-11-12', '09:00', TZ) }),
      options,
    )

    expect(state).toMatchObject({ kind: 'overdue', label: 'Atrasada', sentence: 'Venció hoy' })
  })

  it('cuenta hace cuánto venció', () => {
    const yesterday = getTaskDueState(
      makeTask({ due_at: zonedToUtcIso('2026-11-11', '23:59', TZ) }),
      options,
    )
    const older = getTaskDueState(
      makeTask({ due_at: zonedToUtcIso('2026-11-09', '23:59', TZ) }),
      options,
    )

    expect(yesterday.sentence).toBe('Venció ayer')
    expect(older).toMatchObject({ kind: 'overdue', sentence: 'Venció hace 3 días' })
  })

  it('una tarea terminada nunca figura como atrasada', () => {
    const state = getTaskDueState(
      makeTask({
        status: 'done',
        completed_at: NOW.toISOString(),
        due_at: zonedToUtcIso('2026-11-01', '23:59', TZ),
      }),
      options,
    )

    expect(state).toMatchObject({ kind: 'done', label: 'Terminada' })
  })

  it('una tarea en espera también puede atrasarse', () => {
    const state = getTaskDueState(
      makeTask({ status: 'waiting', due_at: zonedToUtcIso('2026-11-10', '23:59', TZ) }),
      options,
    )

    expect(state.kind).toBe('overdue')
  })
})

describe('filtros y orden del panel de tareas', () => {
  const tasks = [
    makeTask({ id: 'lejana', due_at: zonedToUtcIso('2026-11-30', '23:59', TZ) }),
    makeTask({
      id: 'terminada-vieja',
      status: 'done',
      completed_at: '2026-11-02T12:00:00.000Z',
      due_at: zonedToUtcIso('2026-11-03', '23:59', TZ),
    }),
    makeTask({ id: 'atrasada', due_at: zonedToUtcIso('2026-11-10', '23:59', TZ) }),
    makeTask({
      id: 'en-espera',
      status: 'waiting',
      subject_id: 'subject-2',
      due_at: zonedToUtcIso('2026-11-15', '23:59', TZ),
    }),
    makeTask({
      id: 'terminada-reciente',
      status: 'done',
      completed_at: '2026-11-11T12:00:00.000Z',
      due_at: zonedToUtcIso('2026-11-20', '23:59', TZ),
    }),
  ]

  it('filtra por estado', () => {
    expect(filterTasks(tasks, { status: 'all' })).toHaveLength(5)
    expect(filterTasks(tasks, { status: 'pending' }).map((task) => task.id)).toEqual([
      'lejana',
      'atrasada',
    ])
    expect(filterTasks(tasks, { status: 'waiting' }).map((task) => task.id)).toEqual(['en-espera'])
    expect(filterTasks(tasks, { status: 'done' })).toHaveLength(2)
  })

  it('filtra por asignatura y combina ambos filtros', () => {
    expect(filterTasks(tasks, { subjectId: 'subject-2' }).map((task) => task.id)).toEqual([
      'en-espera',
    ])
    expect(filterTasks(tasks, { status: 'pending', subjectId: 'subject-2' })).toEqual([])
    expect(filterTasks(tasks, { subjectId: 'all' })).toHaveLength(5)
  })

  it('ordena lo pendiente por vencimiento y deja lo terminado al final', () => {
    expect(sortTasks(tasks).map((task) => task.id)).toEqual([
      'atrasada',
      'en-espera',
      'lejana',
      'terminada-reciente',
      'terminada-vieja',
    ])
  })

  it('no modifica la lista original al ordenar', () => {
    const before = tasks.map((task) => task.id)
    sortTasks(tasks)

    expect(tasks.map((task) => task.id)).toEqual(before)
  })

  it('cuenta las tareas de cada estado', () => {
    expect(countTasksByStatus(tasks)).toEqual({ all: 5, pending: 2, waiting: 1, done: 2 })
    expect(countTasksByStatus([])).toEqual({ all: 0, pending: 0, waiting: 0, done: 0 })
  })
})

describe('color de la tarea', () => {
  const subject = { color_hex: '#FFDE00' }

  it('en el calendario general manda el color de la asignatura', () => {
    expect(resolveTaskColor({ color_hex: '#2F6BFF' }, subject, 'general')).toBe('#FFDE00')
    expect(resolveTaskColor({ color_hex: null }, subject, 'general')).toBe('#FFDE00')
  })

  it('en el calendario de la asignatura la tarea puede tener color propio', () => {
    expect(resolveTaskColor({ color_hex: '#2F6BFF' }, subject, 'subject')).toBe('#2F6BFF')
    expect(resolveTaskColor({ color_hex: null }, subject, 'subject')).toBe('#FFDE00')
  })

  it('usa un color neutro si la asignatura todavía no cargó', () => {
    expect(resolveTaskColor({ color_hex: null }, undefined, 'general')).toBe('#98A2B3')
  })
})

describe('guardado de tareas', () => {
  it('terminar una tarea registra la fecha y reabrirla la limpia', () => {
    expect(statusPatch('done', NOW)).toEqual({ status: 'done', completed_at: NOW.toISOString() })
    expect(statusPatch('pending', NOW)).toEqual({ status: 'pending', completed_at: null })
    expect(statusPatch('waiting', NOW)).toEqual({ status: 'waiting', completed_at: null })
  })

  it('convierte el formulario a la zona horaria del perfil', () => {
    const payload = toTaskPayload(
      { ...validForm, title: 'Ensayo', description: '' },
      { timeZone: TZ, now: NOW },
    )

    expect(payload).toEqual({
      subject_id: 'subject-1',
      title: 'Ensayo',
      description: null,
      kind: 'task',
      status: 'pending',
      color_hex: null,
      node_id: null,
      due_at: '2026-11-14T21:30:00.000Z',
      completed_at: null,
    })
  })

  it('una tarea que se guarda terminada lleva fecha de finalización', () => {
    const payload = toTaskPayload({ ...validForm, status: 'done' }, { timeZone: TZ, now: NOW })

    expect(payload.completed_at).toBe(NOW.toISOString())
  })

  it('editar una tarea ya terminada conserva cuándo se terminó', () => {
    const payload = toTaskPayload(
      { ...validForm, status: 'done' },
      {
        timeZone: TZ,
        now: NOW,
        previous: { status: 'done', completed_at: '2026-11-05T15:00:00.000Z' },
      },
    )

    expect(payload.completed_at).toBe('2026-11-05T15:00:00.000Z')
  })

  it('reabrir una tarea terminada limpia la fecha de finalización', () => {
    const payload = toTaskPayload(
      { ...validForm, status: 'waiting' },
      {
        timeZone: TZ,
        now: NOW,
        previous: { status: 'done', completed_at: '2026-11-05T15:00:00.000Z' },
      },
    )

    expect(payload.completed_at).toBeNull()
  })

  it('carga una tarea existente en el formulario con su fecha y hora locales', () => {
    const task = makeTask({
      title: 'TP Integral',
      description: 'Ejercicios 1 a 10.',
      kind: 'project',
      status: 'waiting',
      color_hex: '#12B886',
      due_at: '2026-11-15T02:59:00.000Z',
    })

    expect(taskToFormValues(task, TZ)).toEqual({
      title: 'TP Integral',
      description: 'Ejercicios 1 a 10.',
      subject_id: 'subject-1',
      kind: 'project',
      status: 'waiting',
      due_date: '2026-11-14',
      due_time: '23:59',
      color_hex: '#12B886',
      node_id: '',
    })
  })

  it('una tarea nueva arranca pendiente, al final del día y con el color de la asignatura', () => {
    expect(emptyTaskFormValues({ subjectId: 'subject-9', dueDate: '2026-11-20' })).toEqual({
      title: '',
      description: '',
      subject_id: 'subject-9',
      kind: 'task',
      status: 'pending',
      due_date: '2026-11-20',
      due_time: '23:59',
      color_hex: '',
      node_id: '',
    })
  })
})
