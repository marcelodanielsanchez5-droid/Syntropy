import { useId } from 'react'
import {
  blendOnCanvas,
  masteryOpacity,
  polygonPoints,
  shapeSides,
  type ContourTier,
  type Contour,
} from './node-rules'

const CONTOUR_GAP = 3
const CONTOUR_WIDTH = 2.5
/** Margen alrededor de la forma para que entren el contorno y el halo. */
export const SHAPE_PADDING = 10

interface NodeShapeProps {
  size: number
  color: string
  /** `null` = nodo raíz. */
  difficulty: number | null
  mastery: number | null
  contour?: Pick<Contour, 'tier' | 'color'> | null
  selected?: boolean
}

function ringPoints(sides: number, radius: number, center: number) {
  return sides === 0 ? null : polygonPoints(sides, radius, center, center)
}

/**
 * Forma de un nodo: polígono según la dificultad, relleno según el dominio y
 * contorno separado según las notas. El nodo raíz es un hexágono con el color
 * pleno de la asignatura y sin contorno (D5).
 */
export function NodeShape({ size, color, difficulty, mastery, contour, selected }: NodeShapeProps) {
  const gradientId = useId()
  const box = size + SHAPE_PADDING * 2
  const center = box / 2
  const radius = size / 2
  const isRoot = difficulty === null
  const sides = isRoot ? 6 : shapeSides(difficulty)
  const fill = isRoot ? color : blendOnCanvas(color, masteryOpacity(mastery ?? 1))
  const tier: ContourTier | null = isRoot ? null : (contour?.tier ?? 'ungraded')
  // En los polígonos, el contorno se aleja un poco más para que la separación se vea pareja.
  const ringRadius = radius + CONTOUR_GAP + CONTOUR_WIDTH / 2 + (sides === 0 ? 0 : 2)
  const ringStroke = tier === 'rainbow' ? `url(#${gradientId})` : (contour?.color ?? '#7D8592')
  const shapePoints = sides === 0 ? null : polygonPoints(sides, radius, center, center)
  const outline = ringPoints(sides, ringRadius, center)

  return (
    <svg
      width={box}
      height={box}
      viewBox={`0 0 ${box} ${box}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      {tier === 'rainbow' ? (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF478D" />
            <stop offset="35%" stopColor="#8B18D9" />
            <stop offset="65%" stopColor="#22B8CF" />
            <stop offset="100%" stopColor="#FFDE00" />
          </linearGradient>
        </defs>
      ) : null}

      {selected ? (
        <circle cx={center} cy={center} r={ringRadius + 5} fill={color} opacity={0.22} />
      ) : null}

      {tier ? (
        outline ? (
          <polygon
            points={outline}
            fill="none"
            stroke={ringStroke}
            strokeWidth={CONTOUR_WIDTH}
            strokeLinejoin="round"
            strokeDasharray={tier === 'ungraded' ? '4 4' : undefined}
          />
        ) : (
          <circle
            cx={center}
            cy={center}
            r={ringRadius}
            fill="none"
            stroke={ringStroke}
            strokeWidth={CONTOUR_WIDTH}
            strokeDasharray={tier === 'ungraded' ? '4 4' : undefined}
          />
        )
      ) : null}

      {shapePoints ? (
        <polygon
          points={shapePoints}
          fill={fill}
          stroke={isRoot ? '#FFFFFF' : color}
          strokeOpacity={isRoot ? 0.35 : 0.9}
          strokeWidth={isRoot ? 2 : 1.25}
          strokeLinejoin="round"
        />
      ) : (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={fill}
          stroke={color}
          strokeOpacity={0.9}
          strokeWidth={1.25}
        />
      )}
    </svg>
  )
}
