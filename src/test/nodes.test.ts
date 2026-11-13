import { describe, expect, it } from 'vitest'
import { nodeFormSchema } from '@/features/nodes/NodeFormDialog'
import {
  CONTOUR_STYLES,
  blendOnCanvas,
  contourTier,
  describeContour,
  masteryOpacity,
  nodeContour,
  nodeSize,
  polygonPoints,
  shapeName,
  shapeSides,
  textColorOn,
} from '@/features/nodes/node-rules'
import { safeFileName, sourceTypeForMime } from '@/features/nodes/node-service'
import {
  LEAF_GAP_X,
  LEVEL_GAP_Y,
  canAddChild,
  flattenTree,
  hasLink,
  layoutPlane,
  layoutTree,
  linksOf,
  newChildPosition,
  newRootPosition,
  nodeLevels,
  subtreeIds,
} from '@/features/nodes/node-tree'
import { toTaskPayload } from '@/features/tasks/task-utils'
import type { KnowledgeNode, NodeLink } from '@/types/database'

let order = 0

function node(
  id: string,
  parent: string | null,
  overrides: Partial<KnowledgeNode> = {},
): KnowledgeNode {
  order += 1

  return {
    id,
    user_id: 'user-1',
    subject_id: 'mate',
    parent_id: parent,
    is_root: parent === null,
    name: id,
    description: null,
    summary: null,
    difficulty: parent === null ? null : 5,
    mastery: parent === null ? null : 5,
    position_x: 0,
    position_y: 0,
    created_at: `2026-11-01T00:00:${String(order).padStart(2, '0')}.000Z`,
    updated_at: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('forma según la dificultad', () => {
  it('sigue la tabla del documento maestro', () => {
    const shapes = Array.from({ length: 10 }, (_, index) => shapeName(index + 1))

    expect(shapes).toEqual([
      'Círculo',
      'Círculo',
      'Triángulo',
      'Cuadrado',
      'Pentágono',
      'Hexágono',
      'Heptágono',
      'Octógono',
      'Eneágono',
      'Eneágono',
    ])
    expect(shapeSides(1)).toBe(0)
    expect(shapeSides(10)).toBe(9)
  })

  it('genera un vértice por lado', () => {
    expect(polygonPoints(5, 10, 20, 20).split(' ')).toHaveLength(5)
    expect(polygonPoints(9, 10, 20, 20).split(' ')).toHaveLength(9)
  })

  it('los temas se achican con cada nivel', () => {
    expect([0, 1, 2, 3].map(nodeSize)).toEqual([92, 68, 56, 48])
  })
})

describe('intensidad según el dominio', () => {
  it('va de 0,18 a 0,90', () => {
    expect(masteryOpacity(1)).toBeCloseTo(0.18, 5)
    expect(masteryOpacity(10)).toBeCloseTo(0.9, 5)
    expect(masteryOpacity(5.5)).toBeCloseTo(0.54, 5)
  })

  it('mezcla el color con el fondo del lienzo', () => {
    expect(blendOnCanvas('#FFFFFF', 1)).toBe('#ffffff')
    expect(blendOnCanvas('#FFFFFF', 0)).toBe('#121a27')
    // (224 + 18) / 2 = 121 = 0x79
    expect(blendOnCanvas('#E01462', 0.5)).toBe('#791745')
  })

  it('elige texto oscuro sobre rellenos claros', () => {
    expect(textColorOn('#FFDE00')).toBe('#0C141F')
    expect(textColorOn('#1C1951')).toBe('#FFFFFF')
  })
})

describe('contorno según las notas', () => {
  it('aplica los rangos del documento', () => {
    expect(
      [null, 0, 29.9, 30, 49.9, 50, 69.9, 70, 89.9, 90, 99.9, 100].map((percent) =>
        contourTier(percent),
      ),
    ).toEqual([
      'ungraded',
      'white',
      'white',
      'bronze',
      'bronze',
      'silver',
      'silver',
      'gold',
      'gold',
      'diamond',
      'diamond',
      'rainbow',
    ])
  })

  it('caso 10: un nodo con dos notas de escalas distintas promedia sus porcentajes', () => {
    const contour = nodeContour([
      { score: 7, scale_min: 1, scale_max: 10 },
      { score: 15, scale_min: 0, scale_max: 20 },
      { score: null, scale_min: 1, scale_max: 10 },
    ])

    // 66,67 % y 75 % → 70,83 %: Oro. La evaluación sin nota no cuenta.
    expect(contour.percent).toBeCloseTo(70.83, 2)
    expect(contour).toMatchObject({ tier: 'gold', label: 'Oro', gradedCount: 2 })
    expect(describeContour(contour)).toBe('Oro · 71 %')
  })

  it('sin notas, el contorno es gris discontinuo y no blanco', () => {
    const contour = nodeContour([])

    expect(contour).toMatchObject({ tier: 'ungraded', percent: null })
    expect(contour.color).toBe(CONTOUR_STYLES.ungraded.color)
    expect(contour.color).not.toBe(CONTOUR_STYLES.white.color)
    expect(describeContour(contour)).toBe('Sin calificar')
  })
})

describe('árbol de temas', () => {
  const tree = [
    node('raiz', null),
    node('funciones', 'raiz'),
    node('lineales', 'funciones'),
    node('cuadraticas', 'funciones'),
    node('vertice', 'cuadraticas'),
    node('limites', 'raiz'),
  ]

  it('calcula el nivel de cada tema', () => {
    expect(Object.fromEntries(nodeLevels(tree))).toEqual({
      raiz: 0,
      funciones: 1,
      lineales: 2,
      cuadraticas: 2,
      vertice: 3,
      limites: 1,
    })
  })

  it('permite hasta tres niveles de temas', () => {
    expect(canAddChild(0)).toBe(true)
    expect(canAddChild(2)).toBe(true)
    expect(canAddChild(3)).toBe(false)
  })

  it('cuenta el subárbol que se borra con un tema', () => {
    expect(subtreeIds('funciones', tree).sort()).toEqual([
      'cuadraticas',
      'funciones',
      'lineales',
      'vertice',
    ])
    expect(subtreeIds('limites', tree)).toEqual(['limites'])
  })

  it('lista los temas en orden de árbol para los desplegables', () => {
    expect(flattenTree(tree).map(({ node: item, level }) => `${level}:${item.id}`)).toEqual([
      '0:raiz',
      '1:funciones',
      '2:lineales',
      '2:cuadraticas',
      '3:vertice',
      '1:limites',
    ])
  })

  it('ordena el árbol con la raíz fija y cada padre sobre sus hijos', () => {
    const { positions, width } = layoutTree(tree, 'raiz', { x: 1000, y: 50 })
    const at = (id: string) => positions.get(id) as { x: number; y: number }

    expect(at('raiz')).toEqual({ x: 1000, y: 50 })
    expect(at('vertice').y).toBe(50 + 3 * LEVEL_GAP_Y)
    // Hojas: lineales, vertice y limites, una columna cada una.
    expect(width).toBe(3 * LEAF_GAP_X)
    expect(at('cuadraticas').x).toBe(at('vertice').x)
    // Las posiciones se redondean a píxeles enteros: el centrado admite 1 px.
    expect(
      Math.abs(at('funciones').x - (at('lineales').x + at('cuadraticas').x) / 2),
    ).toBeLessThanOrEqual(1)
    expect(Math.abs(at('raiz').x - (at('funciones').x + at('limites').x) / 2)).toBeLessThanOrEqual(
      1,
    )
  })

  it('en el plano del año, las materias no se superponen', () => {
    const lengua = [
      node('raiz-lengua', null, { subject_id: 'lengua' }),
      node('literatura', 'raiz-lengua', { subject_id: 'lengua' }),
      node('argumentacion', 'raiz-lengua', { subject_id: 'lengua' }),
    ]
    const positions = layoutPlane([...tree, ...lengua], ['mate', 'lengua'])
    const mateMax = Math.max(...tree.map((item) => positions.get(item.id)?.x ?? 0))
    const lenguaMin = Math.min(...lengua.map((item) => positions.get(item.id)?.x ?? 0))

    expect(positions.size).toBe(tree.length + lengua.length)
    expect(lenguaMin).toBeGreaterThan(mateMax)
  })

  it('ubica un tema nuevo debajo del padre y a la derecha de sus hermanos', () => {
    const parent = { position_x: 100, position_y: 0 }

    expect(newChildPosition(parent, [])).toEqual({ x: 100, y: LEVEL_GAP_Y })
    expect(newChildPosition(parent, [{ position_x: 40 }, { position_x: 190 }])).toEqual({
      x: 190 + LEAF_GAP_X,
      y: LEVEL_GAP_Y,
    })
  })

  it('ubica la raíz de una materia nueva a la derecha de lo que ya existe', () => {
    expect(newRootPosition([])).toEqual({ x: 0, y: 0 })
    expect(newRootPosition([{ position_x: 300 }, { position_x: 900 }]).x).toBeGreaterThan(900)
  })
})

describe('conexiones entre temas', () => {
  const links: NodeLink[] = [
    {
      id: 'l1',
      user_id: 'user-1',
      source_node_id: 'a',
      target_node_id: 'b',
      label: 'se usa en',
      created_at: '',
    },
  ]

  it('detecta un enlace existente en cualquier sentido', () => {
    expect(hasLink(links, 'a', 'b')).toBe(true)
    expect(hasLink(links, 'b', 'a')).toBe(true)
    expect(hasLink(links, 'a', 'c')).toBe(false)
  })

  it('devuelve el otro extremo de cada conexión', () => {
    expect(linksOf(links, 'b')).toEqual([{ link: links[0], otherId: 'a' }])
    expect(linksOf(links, 'c')).toEqual([])
  })
})

describe('formularios y adjuntos', () => {
  it('valida el tema: nombre y escalas de 1 a 10', () => {
    const valid = { name: ' Límites ', difficulty: 8, mastery: 2, description: '', summary: '' }

    expect(nodeFormSchema.safeParse(valid).data?.name).toBe('Límites')
    expect(nodeFormSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false)
    expect(nodeFormSchema.safeParse({ ...valid, difficulty: 11 }).success).toBe(false)
    expect(nodeFormSchema.safeParse({ ...valid, mastery: 0 }).success).toBe(false)
  })

  it('una tarea se guarda con su tema o sin tema', () => {
    const values = {
      title: 'TP',
      description: '',
      subject_id: 'mate',
      kind: 'task' as const,
      status: 'pending' as const,
      due_date: '2026-11-20',
      due_time: '23:59',
      color_hex: '',
      node_id: 'funciones',
    }
    const options = { timeZone: 'UTC', now: new Date('2026-11-13T00:00:00.000Z') }

    expect(toTaskPayload(values, options).node_id).toBe('funciones')
    expect(toTaskPayload({ ...values, node_id: '' }, options).node_id).toBeNull()
  })

  it('clasifica el adjunto según su tipo de archivo', () => {
    expect(sourceTypeForMime('image/png')).toBe('image')
    expect(sourceTypeForMime('audio/mpeg')).toBe('audio')
    expect(sourceTypeForMime('video/mp4')).toBe('video')
    expect(sourceTypeForMime('application/pdf')).toBe('document')
  })

  it('limpia el nombre del archivo para la ruta de Storage', () => {
    expect(safeFileName('Apuntes de Física (1).pdf')).toBe('Apuntes-de-Fisica-1-.pdf')
    expect(safeFileName('///')).toBe('archivo')
    expect(safeFileName(`${'a'.repeat(120)}.pdf`)).toHaveLength(80)
  })
})
