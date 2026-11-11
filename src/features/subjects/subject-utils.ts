import type { Subject } from '@/types/database'
import type { SubjectFormInput } from './subject-schemas'

export function parseTeacherNames(value: string): string[] {
  const seen = new Set<string>()
  const names: string[] = []

  for (const rawName of value.split(/[,;]+/)) {
    const name = rawName.trim()

    if (!name) {
      continue
    }

    const key = name.toLocaleLowerCase('es')

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    names.push(name)

    if (names.length === 20) {
      break
    }
  }

  return names
}

export function formatTeacherNames(names: string[]): string {
  if (names.length === 0) {
    return 'Sin docentes'
  }

  if (names.length === 1) {
    return names[0]
  }

  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

export function subjectToFormValues(subject: Subject): SubjectFormInput {
  return {
    name: subject.name,
    color_hex: subject.color_hex,
    teachersText: subject.teacher_names.join(', '),
    description: subject.description ?? '',
    evaluationCriteria: subject.evaluation_criteria ?? '',
    methodology: subject.methodology ?? '',
    notes: subject.notes ?? '',
  }
}

export function emptySubjectFormValues(color: string): SubjectFormInput {
  return {
    name: '',
    color_hex: color,
    teachersText: '',
    description: '',
    evaluationCriteria: '',
    methodology: '',
    notes: '',
  }
}
