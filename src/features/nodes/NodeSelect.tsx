import { forwardRef, useMemo, type SelectHTMLAttributes } from 'react'
import { Select } from '@/components/ui/Select'
import { useNodes } from './node-hooks'
import { flattenTree } from './node-tree'

interface NodeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  userId: string
  subjectId: string
}

/**
 * Lista de temas de una asignatura para vincular una tarea, un examen o una
 * nota. Vacío = sin tema. El tema tiene que ser de la misma asignatura.
 */
export const NodeSelect = forwardRef<HTMLSelectElement, NodeSelectProps>(function NodeSelect(
  { userId, subjectId, ...props },
  ref,
) {
  const subjectIds = useMemo(() => (subjectId ? [subjectId] : []), [subjectId])
  const nodesQuery = useNodes(userId, subjectIds)
  const options = useMemo(
    () => flattenTree(nodesQuery.data ?? []).filter(({ node }) => !node.is_root),
    [nodesQuery.data],
  )

  return (
    <Select ref={ref} disabled={!subjectId || props.disabled} {...props}>
      <option value="">
        {!subjectId
          ? 'Elegí primero la asignatura'
          : options.length === 0
            ? 'Sin temas cargados'
            : 'Sin tema'}
      </option>
      {options.map(({ node, level }) => (
        <option key={node.id} value={node.id}>
          {`${' '.repeat(Math.max(0, level - 1))}${node.name}`}
        </option>
      ))}
    </Select>
  )
})
