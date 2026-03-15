import { useState, useCallback } from "react"
import { Plus, X } from "lucide-react"
import { useSortable } from "@dnd-kit/react/sortable"
import { CollisionPriority } from "@dnd-kit/abstract"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IssueCard } from "@/components/board/issue-card"
import { createIssue } from "@/lib/queries/issues"
import { boardQueries } from "@/lib/query-keys"
import type { Column as ColumnType, Issue } from "@/lib/database.types"

interface MobileColumnSectionProps {
  column: ColumnType
  index: number
  issues: Issue[]
  boardId: string
  onIssueClick?: (issue: Issue) => void
}

export function MobileColumnSection({
  column,
  index,
  issues,
  boardId,
  onIssueClick,
}: MobileColumnSectionProps) {
  const qc = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState("")

  // useSortable registers this as a droppable container for cross-column card moves.
  // We intentionally don't attach handleRef — columns are NOT draggable on mobile.
  const { ref } = useSortable({
    id: column.id,
    index,
    type: "column",
    accept: ["column", "item"],
    group: "board",
    collisionPriority: CollisionPriority.Low,
    transition: { duration: 250, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
  })

  const handleAddIssue = useCallback(async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    try {
      await createIssue({
        project_id: boardId,
        column_id: column.id,
        title: trimmed,
      })
      setTitle("")
      setIsAdding(false)
      qc.invalidateQueries({
        queryKey: boardQueries.issues(boardId).queryKey,
      })
    } catch {}
  }, [title, boardId, column.id, qc])

  const handleCancel = useCallback(() => {
    setTitle("")
    setIsAdding(false)
  }, [])

  return (
    <div ref={ref} className="mb-6 px-4 py-3">
      {/* Section header */}
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="truncate">{column.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          ({issues.length})
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setIsAdding(true)}
          aria-label={`Add issue to ${column.name}`}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Inline add */}
      {isAdding && (
        <div className="mb-2 flex gap-1.5">
          <Input
            autoFocus
            placeholder="Issue title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddIssue()
              if (e.key === "Escape") handleCancel()
            }}
            className="h-8 flex-1 text-sm"
          />
          <Button size="sm" className="h-8 text-xs" onClick={handleAddIssue}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleCancel}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {issues.map((issue, idx) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            index={idx}
            columnId={column.id}
            onClick={() => onIssueClick?.(issue)}
          />
        ))}
      </div>

      {issues.length === 0 && !isAdding && (
        <p className="py-4 text-center text-xs text-muted-foreground/60 select-none">
          No issues
        </p>
      )}
    </div>
  )
}
