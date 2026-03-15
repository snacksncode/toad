import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { QueryClient } from "@tanstack/react-query"
import { boardQueries } from "@/lib/query-keys"
import type { Column as ColumnType, Issue } from "@/lib/database.types"
import { moveIssue, reorderIssues } from "@/lib/queries/issues"
import { reorderColumns } from "@/lib/queries/columns"
import { toast } from "sonner"
import { move } from "@dnd-kit/helpers"
import type { DragOverEvent, DragEndEvent } from "@dnd-kit/dom"

export function useBoardDnd({
  boardId,
  columns,
  issues,
  filteredIssueIds,
  queryClient,
}: {
  boardId: string
  columns: ColumnType[]
  issues: Issue[]
  filteredIssueIds: Set<string>
  queryClient: QueryClient
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [localColumns, setLocalColumns] = useState<ColumnType[]>(columns)
  const [items, setItems] = useState<Record<string, string[]>>({})
  const itemsRef = useRef<Record<string, string[]>>({})
  const itemsSnapshotRef = useRef<Record<string, string[]>>({})
  const columnsSnapshotRef = useRef<ColumnType[]>([])

  useEffect(() => {
    if (isDragging) return
    setLocalColumns(columns)
  }, [columns, isDragging])

  useEffect(() => {
    if (isDragging) return
    const map: Record<string, string[]> = {}
    for (const col of localColumns) {
      map[col.id] = issues
        .filter((i) => i.column_id === col.id)
        .sort((a, b) => a.position - b.position)
        .map((i) => i.id)
    }
    setItems(map)
  }, [issues, localColumns, isDragging])

  const issueMap = useMemo(() => {
    const map = new Map<string, Issue>()
    for (const issue of issues) {
      map.set(issue.id, issue)
    }
    return map
  }, [issues])

  const getColumnIssues = useCallback(
    (columnId: string): Issue[] => {
      const ids = items[columnId] ?? []
      return ids
        .filter((id) => filteredIssueIds.has(id))
        .map((id) => issueMap.get(id))
        .filter((issue): issue is Issue => issue !== undefined)
    },
    [items, filteredIssueIds, issueMap]
  )

  const onDragStart = useCallback(() => {
    setIsDragging(true)
    queryClient.cancelQueries({
      queryKey: boardQueries.issues(boardId).queryKey,
    })
    itemsSnapshotRef.current = structuredClone(items)
    columnsSnapshotRef.current = [...localColumns]
  }, [queryClient, boardId, items, localColumns])

  const onDragOver = useCallback((event: Parameters<DragOverEvent>[0]) => {
    const { source } = event.operation
    if (source?.type === "column") return
    setItems((currentItems) => {
      const next = move(currentItems, event)
      itemsRef.current = next
      return next
    })
  }, [])

  const onDragEnd = useCallback(
    async (event: Parameters<DragEndEvent>[0]) => {
      const { source } = event.operation
      if (!source) {
        setIsDragging(false)
        return
      }

      if (event.canceled) {
        if (source.type === "item") setItems(itemsSnapshotRef.current)
        if (source.type === "column")
          setLocalColumns(columnsSnapshotRef.current)
        setIsDragging(false)
        return
      }

      if (source.type === "column") {
        const target = event.operation.target
        if (target && target.type === "column") {
          const sourceIdx = localColumns.findIndex(
            (c) => c.id === String(source.id)
          )
          const targetIdx = localColumns.findIndex(
            (c) => c.id === String(target.id)
          )
          if (sourceIdx !== -1 && targetIdx !== -1 && sourceIdx !== targetIdx) {
            const newColumns = [...localColumns]
            const [moved] = newColumns.splice(sourceIdx, 1)
            newColumns.splice(targetIdx, 0, moved)
            setLocalColumns(newColumns)
            try {
              await reorderColumns(
                boardId,
                newColumns.map((c) => c.id)
              )
            } catch {
              queryClient.invalidateQueries({
                queryKey: boardQueries.columns(boardId).queryKey,
              })
              toast.error("Failed to reorder columns")
            }
          }
        }
        setIsDragging(false)
        return
      }

      const issueId = String(source.id)
      const currentItems = itemsRef.current

      let newGroupKey: string | null = null
      let newPosition = 0
      for (const [key, ids] of Object.entries(currentItems)) {
        const idx = ids.indexOf(issueId)
        if (idx !== -1) {
          newGroupKey = key
          newPosition = idx
          break
        }
      }

      if (!newGroupKey || !issueMap.get(issueId)) {
        setIsDragging(false)
        return
      }

      const issue = issueMap.get(issueId)!
      const originalGroupKey = issue.column_id
      const newColumnId = newGroupKey

      try {
        if (originalGroupKey !== newGroupKey) {
          await moveIssue(issueId, newColumnId, newPosition)
          const targetIds = currentItems[newGroupKey] ?? []
          if (targetIds.length > 0) await reorderIssues(newGroupKey, targetIds)
          const origIds = currentItems[originalGroupKey] ?? []
          if (origIds.length > 0) await reorderIssues(originalGroupKey, origIds)
        } else {
          const ids = currentItems[newGroupKey] ?? []
          await reorderIssues(newGroupKey, ids)
        }
        queryClient.setQueryData(
          boardQueries.issues(boardId).queryKey,
          (old: Issue[] | undefined) => {
            if (!old) return old
            return old.map((iss) => {
              for (const [key, ids] of Object.entries(currentItems)) {
                const idx = ids.indexOf(iss.id)
                if (idx !== -1) {
                  return { ...iss, column_id: key, position: idx }
                }
              }
              return iss
            })
          }
        )
        queryClient.invalidateQueries({
          queryKey: boardQueries.issues(boardId).queryKey,
        })
      } catch {
        setItems(itemsSnapshotRef.current)
        toast.error("Failed to move issue")
      }
      setIsDragging(false)
    },
    [localColumns, boardId, queryClient, issueMap]
  )

  return {
    localColumns,
    setLocalColumns,
    isDragging,
    items,
    issueMap,
    getColumnIssues,
    dndProps: { onDragStart, onDragOver, onDragEnd },
  }
}
