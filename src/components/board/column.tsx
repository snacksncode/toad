import { useState, useCallback } from "react"

import {
  MoreVertical,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Pencil,
  GripVertical,
} from "lucide-react"
import { useSortable } from "@dnd-kit/react/sortable"
import { CollisionPriority } from "@dnd-kit/abstract"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IssueCard } from "@/components/board/issue-card"
import { cn } from "@/lib/utils"
import type { Column as ColumnType, Issue } from "@/lib/database.types"

interface ColumnProps {
  column: ColumnType
  index: number
  issues: Issue[]
  isFirst: boolean
  isLast: boolean
  onRename: (name: string) => void
  onDelete: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
  onIssueClick?: (issue: Issue) => void
}

export function Column({
  column,
  index,
  issues,
  isFirst,
  isLast,
  onRename,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onIssueClick,
}: ColumnProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(column.name)

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== column.name) {
      onRename(trimmed)
    } else {
      setEditValue(column.name)
    }
    setIsEditing(false)
  }, [editValue, column.name, onRename])

  const cancelRename = useCallback(() => {
    setEditValue(column.name)
    setIsEditing(false)
  }, [column.name])

  const { ref, handleRef, isDragSource } = useSortable({
    id: column.id,
    index,
    type: "column",
    accept: ["column", "item"],
    group: "board",
    collisionPriority: CollisionPriority.Low,
    transition: { duration: 250, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
  })

  return (
    <div
      ref={ref}
      className={cn(
        "flex w-[calc(100vw-2rem)] shrink-0 snap-center flex-col rounded-xl border border-border/50 bg-muted/50 transition-all md:w-80",
        isDragSource && "opacity-50 shadow-lg ring-2 ring-primary/30"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 border-b border-border/30 px-3.5 py-3">
        <div
          ref={handleRef}
          className="-ml-1 shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
          aria-label="Drag to reorder column"
        >
          <GripVertical className="size-3.5" />
        </div>
        {isEditing ? (
          <Input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") cancelRename()
            }}
            className="h-7 bg-background px-1.5 text-sm font-semibold"
          />
        ) : (
          <span
            className="flex-1 cursor-default truncate px-1 text-sm font-semibold select-none"
            onDoubleClick={() => setIsEditing(true)}
            title="Double-click to rename"
            aria-label={`Column: ${column.name}, double-click to rename`}
          >
            {column.name}
          </span>
        )}

        {!isEditing && (
          <>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {issues.length}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="size-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMoveLeft} disabled={isFirst}>
                  <ArrowLeft className="size-3.5" />
                  Move Left
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMoveRight} disabled={isLast}>
                  <ArrowRight className="size-3.5" />
                  Move Right
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Column Body */}
      <div className="relative min-h-[200px] flex-1 px-2.5 py-2.5">
        {issues.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/60 select-none">
            No issues
          </p>
        )}
        <div className="flex flex-col gap-2">
          {issues.map((issue, index) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              index={index}
              columnId={column.id}
              onClick={() => onIssueClick?.(issue)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
