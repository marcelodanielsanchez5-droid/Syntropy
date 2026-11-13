import type { KnowledgeNode, NodeLink } from '@/types/database'

/** Raíz → principal → secundario → terciario: tres niveles de temas (modelo, 7.4). */
export const MAX_TOPIC_LEVEL = 3

export const LEVEL_GAP_Y = 170
export const LEAF_GAP_X = 150
const SUBJECT_GAP_X = 260

type TreeNode = Pick<KnowledgeNode, 'id' | 'parent_id' | 'is_root' | 'subject_id'>

export function childrenMap<T extends TreeNode>(nodes: T[]): Map<string, T[]> {
  const children = new Map<string, T[]>()

  for (const node of nodes) {
    if (node.parent_id) {
      children.set(node.parent_id, [...(children.get(node.parent_id) ?? []), node])
    }
  }

  return children
}

/** Nivel de cada nodo: 0 la raíz, 1 los temas principales, etc. */
export function nodeLevels<T extends TreeNode>(nodes: T[]): Map<string, number> {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const levels = new Map<string, number>()

  function level(node: T, guard = 0): number {
    const known = levels.get(node.id)

    if (known !== undefined) {
      return known
    }

    const parent = node.parent_id ? byId.get(node.parent_id) : undefined
    // `guard` evita un bucle infinito si los datos tuvieran un ciclo.
    const value =
      node.is_root || !parent || guard > 10 ? (node.is_root ? 0 : 1) : level(parent, guard + 1) + 1
    levels.set(node.id, value)
    return value
  }

  for (const node of nodes) {
    level(node)
  }

  return levels
}

/** El nodo y todos sus descendientes. */
export function subtreeIds<T extends TreeNode>(nodeId: string, nodes: T[]): string[] {
  const children = childrenMap(nodes)
  const result: string[] = []
  const stack = [nodeId]

  while (stack.length > 0) {
    const current = stack.pop() as string
    result.push(current)
    stack.push(...(children.get(current) ?? []).map((child) => child.id))
  }

  return result
}

export function canAddChild(level: number): boolean {
  return level < MAX_TOPIC_LEVEL
}

export interface Position {
  x: number
  y: number
}

/**
 * Orden automático de un árbol, de arriba hacia abajo: cada hoja ocupa una
 * columna y cada padre queda centrado sobre sus hijos. La raíz se mantiene en
 * `origin`. Devuelve también el ancho total, para ubicar varias asignaturas.
 */
export function layoutTree<T extends TreeNode & Pick<KnowledgeNode, 'created_at' | 'name'>>(
  nodes: T[],
  rootId: string,
  origin: Position,
): { positions: Map<string, Position>; width: number } {
  const children = childrenMap(nodes)
  const relativeX = new Map<string, number>()
  const depth = new Map<string, number>()
  let nextLeaf = 0

  for (const list of children.values()) {
    list.sort((a, b) =>
      a.created_at < b.created_at
        ? -1
        : a.created_at > b.created_at
          ? 1
          : a.name.localeCompare(b.name),
    )
  }

  function place(id: string, level: number, guard = 0): number {
    depth.set(id, level)
    const kids = guard > 10 ? [] : (children.get(id) ?? [])

    if (kids.length === 0) {
      const x = nextLeaf * LEAF_GAP_X
      nextLeaf += 1
      relativeX.set(id, x)
      return x
    }

    const xs = kids.map((child) => place(child.id, level + 1, guard + 1))
    const x = (Math.min(...xs) + Math.max(...xs)) / 2
    relativeX.set(id, x)
    return x
  }

  const rootX = place(rootId, 0)
  const positions = new Map<string, Position>()

  for (const [id, x] of relativeX) {
    positions.set(id, {
      x: Math.round(origin.x + x - rootX),
      y: Math.round(origin.y + (depth.get(id) ?? 0) * LEVEL_GAP_Y),
    })
  }

  return { positions, width: Math.max(1, nextLeaf) * LEAF_GAP_X }
}

/**
 * Orden del plano del año: los árboles de cada asignatura uno al lado del
 * otro, sin superponerse, en el orden recibido.
 */
export function layoutPlane<T extends TreeNode & Pick<KnowledgeNode, 'created_at' | 'name'>>(
  nodes: T[],
  subjectOrder: string[],
): Map<string, Position> {
  const positions = new Map<string, Position>()
  let cursor = 0

  for (const subjectId of subjectOrder) {
    const subjectNodes = nodes.filter((node) => node.subject_id === subjectId)
    const root = subjectNodes.find((node) => node.is_root)

    if (!root) {
      continue
    }

    const probe = layoutTree(subjectNodes, root.id, { x: 0, y: 0 })
    const half = probe.width / 2
    const placed = layoutTree(subjectNodes, root.id, { x: cursor + half, y: 0 })

    for (const [id, position] of placed.positions) {
      positions.set(id, position)
    }

    cursor += probe.width + SUBJECT_GAP_X
  }

  return positions
}

/** Posición inicial de un tema nuevo: debajo de su padre, a la derecha de sus hermanos. */
export function newChildPosition(
  parent: Pick<KnowledgeNode, 'position_x' | 'position_y'>,
  siblings: Array<Pick<KnowledgeNode, 'position_x'>>,
): Position {
  const rightmost = siblings.length
    ? Math.max(...siblings.map((sibling) => sibling.position_x)) + LEAF_GAP_X
    : parent.position_x

  return { x: Math.round(rightmost), y: Math.round(parent.position_y + LEVEL_GAP_Y) }
}

/** Posición del nodo raíz de una asignatura nueva: a la derecha de todo lo que ya existe. */
export function newRootPosition(nodes: Array<Pick<KnowledgeNode, 'position_x'>>): Position {
  if (nodes.length === 0) {
    return { x: 0, y: 0 }
  }

  return {
    x: Math.round(Math.max(...nodes.map((node) => node.position_x)) + SUBJECT_GAP_X + LEAF_GAP_X),
    y: 0,
  }
}

/** Indica si ya existe un enlace entre dos nodos, en cualquier sentido. */
export function hasLink(
  links: Array<Pick<NodeLink, 'source_node_id' | 'target_node_id'>>,
  a: string,
  b: string,
) {
  return links.some(
    (link) =>
      (link.source_node_id === a && link.target_node_id === b) ||
      (link.source_node_id === b && link.target_node_id === a),
  )
}

/** Enlaces de un nodo, con el otro extremo resuelto. */
export function linksOf(
  links: NodeLink[],
  nodeId: string,
): Array<{ link: NodeLink; otherId: string }> {
  return links
    .filter((link) => link.source_node_id === nodeId || link.target_node_id === nodeId)
    .map((link) => ({
      link,
      otherId: link.source_node_id === nodeId ? link.target_node_id : link.source_node_id,
    }))
}

/** Temas ordenados como árbol (padre antes que hijos), para listas desplegables. */
export function flattenTree<T extends TreeNode & Pick<KnowledgeNode, 'created_at' | 'name'>>(
  nodes: T[],
): Array<{ node: T; level: number }> {
  const children = childrenMap(nodes)
  const result: Array<{ node: T; level: number }> = []

  for (const list of children.values()) {
    list.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
  }

  function visit(node: T, level: number, guard = 0) {
    result.push({ node, level })

    if (guard > 10) {
      return
    }

    for (const child of children.get(node.id) ?? []) {
      visit(child, level + 1, guard + 1)
    }
  }

  for (const root of nodes.filter((node) => node.is_root)) {
    visit(root, 0)
  }

  return result
}
