import { toPercent } from '@/features/grades/grade-math'
import type { Assessment } from '@/types/database'

/**
 * Reglas visuales de los nodos (documento maestro, sección 5, y sistema de
 * diseño, sección 8). Funciones puras: no dependen de React ni de la base.
 */

export const NODE_CANVAS_BG = '#121A27'

/** Lados del polígono según la dificultad (1–10). 0 = círculo. */
export function shapeSides(difficulty: number): number {
  if (difficulty <= 2) {
    return 0
  }

  return Math.min(9, Math.round(difficulty))
}

const SHAPE_NAMES: Record<number, string> = {
  0: 'Círculo',
  3: 'Triángulo',
  4: 'Cuadrado',
  5: 'Pentágono',
  6: 'Hexágono',
  7: 'Heptágono',
  8: 'Octógono',
  9: 'Eneágono',
}

export function shapeName(difficulty: number): string {
  return SHAPE_NAMES[shapeSides(difficulty)]
}

/** Intensidad del relleno según el dominio (1–10): de 0,18 a 0,90. */
export function masteryOpacity(mastery: number): number {
  const clamped = Math.min(10, Math.max(1, mastery))
  return 0.18 + ((clamped - 1) / 9) * 0.72
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16)) as [
    number,
    number,
    number,
  ]
}

/**
 * Mezcla el color de la asignatura con el fondo del lienzo. Se usa un color
 * sólido (no transparencia) para que el contorno y las líneas no se vean a
 * través del nodo.
 */
export function blendOnCanvas(hex: string, opacity: number, background = NODE_CANVAS_BG): string {
  const [r1, g1, b1] = hexToRgb(hex)
  const [r2, g2, b2] = hexToRgb(background)
  const mix = (front: number, back: number) => Math.round(front * opacity + back * (1 - opacity))

  return `#${[mix(r1, r2), mix(g1, g2), mix(b1, b2)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`
}

/** Luminancia relativa (WCAG) para decidir el color del texto sobre el relleno. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Texto oscuro sobre rellenos claros y blanco sobre los oscuros. */
export function textColorOn(hex: string): string {
  return relativeLuminance(hex) > 0.35 ? '#0C141F' : '#FFFFFF'
}

export type ContourTier =
  'ungraded' | 'white' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'rainbow'

export interface Contour {
  tier: ContourTier
  label: string
  color: string
  /** Promedio simple de porcentajes; `null` si no hay notas. */
  percent: number | null
  gradedCount: number
}

export const CONTOUR_STYLES: Record<ContourTier, { label: string; color: string }> = {
  ungraded: { label: 'Sin calificar', color: '#7D8592' },
  white: { label: 'Blanco', color: '#F8FAFC' },
  bronze: { label: 'Bronce', color: '#B87333' },
  silver: { label: 'Plata', color: '#C0C7D1' },
  gold: { label: 'Oro', color: '#F5C542' },
  diamond: { label: 'Diamante', color: '#7FE7FF' },
  rainbow: { label: 'Multicolor', color: '#FF478D' },
}

/** Nivel del contorno según el porcentaje (documento maestro, sección 5.3). */
export function contourTier(percent: number | null): ContourTier {
  if (percent === null) {
    return 'ungraded'
  }

  if (percent >= 99.995) {
    return 'rainbow'
  }

  if (percent >= 90) {
    return 'diamond'
  }

  if (percent >= 70) {
    return 'gold'
  }

  if (percent >= 50) {
    return 'silver'
  }

  return percent >= 30 ? 'bronze' : 'white'
}

/**
 * Contorno de un nodo: promedio simple de los porcentajes de sus evaluaciones
 * con nota, cada una con su propia escala (sección 5.5 del modelo de datos).
 */
export function nodeContour(
  assessments: Array<Pick<Assessment, 'score' | 'scale_min' | 'scale_max'>>,
): Contour {
  const percents = assessments
    .filter((assessment) => assessment.score !== null)
    .map((assessment) =>
      toPercent(Number(assessment.score), {
        min: Number(assessment.scale_min),
        max: Number(assessment.scale_max),
      }),
    )
  const percent = percents.length
    ? percents.reduce((sum, value) => sum + value, 0) / percents.length
    : null
  const tier = contourTier(percent)

  return { tier, ...CONTOUR_STYLES[tier], percent, gradedCount: percents.length }
}

/** «Plata · 64 %» o «Sin calificar». */
export function describeContour(contour: Contour): string {
  return contour.percent === null
    ? contour.label
    : `${contour.label} · ${Math.round(contour.percent)} %`
}

/** Tamaño del nodo en px según su nivel: raíz, principal, secundario, terciario. */
export function nodeSize(level: number): number {
  return [92, 68, 56, 48][Math.min(3, Math.max(0, level))]
}

/**
 * Vértices de un polígono regular. Los de lados impares apuntan hacia arriba;
 * los de lados pares quedan apoyados sobre un lado (el cuadrado no es un rombo).
 */
export function polygonPoints(sides: number, radius: number, cx: number, cy: number): string {
  const start = -90 + (sides % 2 === 0 ? 180 / sides : 0)

  return Array.from({ length: sides }, (_, index) => {
    const angle = ((start + (360 / sides) * index) * Math.PI) / 180
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`
  }).join(' ')
}

export const LEVEL_NAMES = ['Asignatura', 'Tema principal', 'Tema secundario', 'Tema terciario']
