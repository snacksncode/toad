import { useCallback } from "react"
import type { QueryClient } from "@tanstack/react-query"
import { boardQueries } from "@/lib/query-keys"
import {
  createColumn,
  updateColumn,
  reorderColumns,
  deleteColumn,
} from "@/lib/queries/columns"
import type { Column as ColumnType } from "@/lib/database.types"
import { toast } from "sonner"

export function useBoardMutations({
  boardId,
  queryClient,
  localColumns,
  setLocalColumns,
}: {
  boardId: string
  queryClient: QueryClient
  localColumns: ColumnType[]
  setLocalColumns: React.Dispatch<React.SetStateAction<ColumnType[]>>
}) {
  const handleCreateColumn = useCallback(
    async (name: string) => {
      try {
        await createColumn(boardId, name)
        queryClient.invalidateQueries({
          queryKey: boardQueries.columns(boardId).queryKey,
        })
      } catch {
        toast.error("Failed to create column")
      }
    },
    [boardId, queryClient]
  )

  const handleRenameColumn = useCallback(
    async (columnId: string, name: string) => {
      try {
        await updateColumn(columnId, { name })
        queryClient.invalidateQueries({
          queryKey: boardQueries.columns(boardId).queryKey,
        })
      } catch {
        toast.error("Failed to rename column")
      }
    },
    [boardId, queryClient]
  )

  const handleDeleteColumn = useCallback(
    async (columnId: string) => {
      try {
        await deleteColumn(columnId)
        queryClient.invalidateQueries({
          queryKey: boardQueries.columns(boardId).queryKey,
        })
      } catch (err: unknown) {
        const isPostgresError = (e: unknown): e is { code: string } =>
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          typeof (e as any).code === "string"

        if (isPostgresError(err) && err.code === "23503") {
          toast.error(
            "Cannot delete column with issues. Move or delete issues first."
          )
        } else {
          toast.error("Failed to delete column")
        }
      }
    },
    [boardId, queryClient]
  )

  const handleMoveColumn = useCallback(
    async (columnId: string, direction: "left" | "right") => {
      const idx = localColumns.findIndex((c) => c.id === columnId)
      if (idx === -1) return

      const swapIdx = direction === "left" ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= localColumns.length) return

      const newOrder = [...localColumns]
      const temp = newOrder[idx]
      newOrder[idx] = newOrder[swapIdx]
      newOrder[swapIdx] = temp

      // Optimistic update
      setLocalColumns(newOrder)

      try {
        await reorderColumns(
          boardId,
          newOrder.map((c) => c.id)
        )
        queryClient.invalidateQueries({
          queryKey: boardQueries.columns(boardId).queryKey,
        })
      } catch {
        queryClient.invalidateQueries({
          queryKey: boardQueries.columns(boardId).queryKey,
        })
        toast.error("Failed to reorder columns")
      }
    },
    [localColumns, boardId, queryClient, setLocalColumns]
  )

  return {
    handleCreateColumn,
    handleRenameColumn,
    handleDeleteColumn,
    handleMoveColumn,
  }
}
