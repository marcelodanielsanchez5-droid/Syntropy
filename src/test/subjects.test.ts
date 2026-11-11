import { describe, expect, it } from 'vitest'
import type { Subject } from '@/types/database'
import { subjectFormSchema } from '@/features/subjects/subject-schemas'
import {
  emptySubjectFormValues,
  formatTeacherNames,
  parseTeacherNames,
  subjectToFormValues,
} from '@/features/subjects/subject-utils'

const validSubject = {
  name: 'Matemática',
  color_hex: '#E01462',
  teachersText: 'Laura Gómez, Ana Pérez',
  description: 'Álgebra y funciones.',
  evaluationCriteria: 'Exámenes y trabajos prácticos.',
  methodology: 'Clases expositivas y ejercicios.',
  notes: 'Traer calculadora.',
}

describe('subjectFormSchema', () => {
  it('acepta una asignatura válida y recorta los textos', () => {
    const result = subjectFormSchema.parse({
      ...validSubject,
      name: '  Matemática  ',
      description: '  Álgebra y funciones.  ',
    })

    expect(result.name).toBe('Matemática')
    expect(result.description).toBe('Álgebra y funciones.')
  })

  it('exige nombre y color válido', () => {
    expect(subjectFormSchema.safeParse({ ...validSubject, name: '   ' }).success).toBe(false)
    expect(subjectFormSchema.safeParse({ ...validSubject, color_hex: '#12345' }).success).toBe(
      false,
    )
    expect(subjectFormSchema.safeParse({ ...validSubject, color_hex: 'rosa' }).success).toBe(false)
  })

  it('limita la longitud de los textos', () => {
    expect(
      subjectFormSchema.safeParse({ ...validSubject, description: 'a'.repeat(1001) }).success,
    ).toBe(false)
    expect(
      subjectFormSchema.safeParse({ ...validSubject, notes: 'a'.repeat(2001) }).success,
    ).toBe(false)
    expect(
      subjectFormSchema.safeParse({ ...validSubject, teachersText: 'a'.repeat(501) }).success,
    ).toBe(false)
  })

  it('permite campos opcionales vacíos', () => {
    expect(
      subjectFormSchema.safeParse({
        ...validSubject,
        teachersText: '',
        description: '',
        evaluationCriteria: '',
        methodology: '',
        notes: '',
      }).success,
    ).toBe(true)
  })
})

describe('parseTeacherNames', () => {
  it('separa por coma o punto y coma, recorta y omite vacíos', () => {
    expect(parseTeacherNames(' Laura Gómez, Ana Pérez;  , ')).toEqual([
      'Laura Gómez',
      'Ana Pérez',
    ])
  })

  it('deduplica sin distinguir mayúsculas y conserva la primera forma', () => {
    expect(parseTeacherNames('Laura Gómez, laura gómez; LAURA GÓMEZ, Ana')).toEqual([
      'Laura Gómez',
      'Ana',
    ])
  })

  it('limita la lista a 20 docentes', () => {
    const names = Array.from({ length: 25 }, (_, index) => `Docente ${index + 1}`)
    const result = parseTeacherNames(names.join(', '))

    expect(result).toHaveLength(20)
    expect(result[19]).toBe('Docente 20')
  })

  it('devuelve una lista vacía para un texto vacío', () => {
    expect(parseTeacherNames('   ')).toEqual([])
  })
})

describe('formatTeacherNames', () => {
  it('describe listas vacías, de uno y de varios docentes', () => {
    expect(formatTeacherNames([])).toBe('Sin docentes')
    expect(formatTeacherNames(['Laura Gómez'])).toBe('Laura Gómez')
    expect(formatTeacherNames(['Ana', 'Luis', 'Marta'])).toBe('Ana, Luis y Marta')
  })
})

describe('subjectToFormValues y emptySubjectFormValues', () => {
  const subject: Subject = {
    id: 'subject-1',
    user_id: 'user-1',
    academic_year_id: 'year-1',
    name: 'Matemática',
    description: null,
    color_hex: '#E01462',
    teacher_names: ['Laura Gómez'],
    notes: null,
    evaluation_criteria: 'Exámenes',
    methodology: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  }

  it('convierte una asignatura a valores de formulario', () => {
    expect(subjectToFormValues(subject)).toEqual({
      name: 'Matemática',
      color_hex: '#E01462',
      teachersText: 'Laura Gómez',
      description: '',
      evaluationCriteria: 'Exámenes',
      methodology: '',
      notes: '',
    })
  })

  it('crea un formulario vacío con el color indicado', () => {
    expect(emptySubjectFormValues('#6F07C8')).toEqual({
      name: '',
      color_hex: '#6F07C8',
      teachersText: '',
      description: '',
      evaluationCriteria: '',
      methodology: '',
      notes: '',
    })
  })
})
