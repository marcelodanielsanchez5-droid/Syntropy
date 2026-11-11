export const SUBJECT_COLORS = [
  { name: 'Rosa', hex: '#E01462' },
  { name: 'Fucsia', hex: '#FF478D' },
  { name: 'Morado', hex: '#6F07C8' },
  { name: 'Violeta', hex: '#9A15AF' },
  { name: 'Azul', hex: '#2F6BFF' },
  { name: 'Celeste', hex: '#22B8CF' },
  { name: 'Turquesa', hex: '#12B886' },
  { name: 'Verde', hex: '#37B24D' },
  { name: 'Lima', hex: '#94D82D' },
  { name: 'Amarillo', hex: '#FFDE00' },
  { name: 'Naranja', hex: '#FF922B' },
  { name: 'Rojo', hex: '#FA5252' },
] as const

export const DEFAULT_SUBJECT_COLOR = SUBJECT_COLORS[0].hex

export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

export function withAlpha(hex: string, alpha: number): string {
  if (!isHexColor(hex)) {
    return `rgba(224, 20, 98, ${alpha})`
  }

  const normalized = hex.replace('#', '')
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export function getInitials(name: string | null | undefined, fallback = 'S'): string {
  const clean = (name ?? '').trim()

  if (!clean) {
    return fallback
  }

  const words = clean.split(/\s+/).filter(Boolean)

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

export function getSubjectColorName(hex: string): string {
  return SUBJECT_COLORS.find((color) => color.hex.toLowerCase() === hex.toLowerCase())?.name ?? 'Personalizado'
}
