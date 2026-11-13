import { NodeShape } from './NodeShape'
import { CONTOUR_STYLES, type ContourTier } from './node-rules'

const DIFFICULTIES = [1, 3, 4, 5, 6, 7, 8, 9]
const TIERS: Array<{ tier: ContourTier; range: string }> = [
  { tier: 'ungraded', range: 'sin notas' },
  { tier: 'white', range: '0–29 %' },
  { tier: 'bronze', range: '30–49 %' },
  { tier: 'silver', range: '50–69 %' },
  { tier: 'gold', range: '70–89 %' },
  { tier: 'diamond', range: '90–99 %' },
  { tier: 'rainbow', range: '100 %' },
]

/** Leyenda de las reglas visuales: forma, intensidad y contorno. Nunca solo color. */
export function NodeLegend({ color = '#8B18D9' }: { color?: string }) {
  return (
    <div className="space-y-4 text-xs text-ink-muted">
      <div>
        <p className="mb-2 font-semibold text-ink-secondary">Forma = dificultad</p>
        <ul className="grid grid-cols-4 gap-1.5">
          {DIFFICULTIES.map((difficulty) => (
            <li key={difficulty} className="flex flex-col items-center gap-0.5">
              <NodeShape
                size={18}
                color={color}
                difficulty={difficulty}
                mastery={7}
                contour={null}
              />
              <span className="tabular-nums">
                {difficulty === 1 ? '1–2' : difficulty === 9 ? '9–10' : difficulty}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 font-semibold text-ink-secondary">Intensidad = dominio</p>
        <ul className="flex items-end justify-between gap-1">
          {[1, 4, 7, 10].map((mastery) => (
            <li key={mastery} className="flex flex-col items-center gap-0.5">
              <NodeShape size={20} color={color} difficulty={1} mastery={mastery} contour={null} />
              <span className="tabular-nums">{mastery}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 font-semibold text-ink-secondary">Contorno = notas</p>
        <ul className="space-y-1">
          {TIERS.map(({ tier, range }) => (
            <li key={tier} className="flex items-center gap-2">
              <NodeShape
                size={14}
                color="#2F3947"
                difficulty={1}
                mastery={1}
                contour={{ tier, color: CONTOUR_STYLES[tier].color }}
              />
              <span className="font-medium text-ink-secondary">{CONTOUR_STYLES[tier].label}</span>
              <span className="ml-auto tabular-nums">{range}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
