import { toTimeInputValue } from '@/lib/datetime'
import type { ScheduleEntry, ScheduleEntryType, Subject } from '@/types/database'
import type { ScheduleFormInput } from './schedule-schemas'
import { ENTRY_TYPE_LABELS } from './schedule-utils'

export function emptyScheduleFormValues({
  subjectId = '',
  weekday,
  entryType = 'class',
}: {
  subjectId?: string
  weekday?: number
  entryType?: ScheduleEntryType
} = {}): ScheduleFormInput {
  return {
    entry_type: entryType,
    subject_id: subjectId,
    title: '',
    weekdays: weekday ? [weekday] : [],
    starts_at: '08:00',
    ends_at: '09:30',
    location: '',
    notes: '',
  }
}

export function scheduleEntryToFormValues(entry: ScheduleEntry): ScheduleFormInput {
  return {
    entry_type: entry.entry_type,
    subject_id: entry.subject_id ?? '',
    title: entry.title,
    weekdays: [entry.weekday],
    starts_at: toTimeInputValue(entry.starts_at),
    ends_at: toTimeInputValue(entry.ends_at),
    location: entry.location ?? '',
    notes: entry.notes ?? '',
  }
}

/**
 * Nombre que se guarda: el escrito o, si quedó vacío, el de la asignatura (o
 * el tipo de bloque). La base exige un nombre.
 */
export function resolveEntryTitle(values: ScheduleFormInput, subject: Subject | undefined): string {
  return values.title || subject?.name || ENTRY_TYPE_LABELS[values.entry_type]
}

/** Un registro por día elegido, listo para guardar. */
export function toSchedulePayloads(values: ScheduleFormInput, subject: Subject | undefined) {
  return [...new Set(values.weekdays)]
    .sort((a, b) => a - b)
    .map((weekday) => ({
      entry_type: values.entry_type,
      subject_id: values.subject_id || null,
      title: resolveEntryTitle(values, subject),
      weekday,
      starts_at: values.starts_at,
      ends_at: values.ends_at,
      location: values.location || null,
      notes: values.notes || null,
    }))
}

export type SchedulePayload = ReturnType<typeof toSchedulePayloads>[number]
