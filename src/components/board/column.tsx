import { useState, useRef, useEffect, useCallback } from "react"
import { MoreVertical, ArrowLeft, ArrowRight, Trash2, Pencil, GripVertical } from "lucide-react"
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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

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

  const { ref, handleRef, isDragSource, isDropTarget } = useSortable({
    id: column.id,
    index,
    type: "column",
    accept: ["column", "item"],
    group: "board",
    collisionPriority: CollisionPriority.Low,
  })

  return (
    <div ref={ref} className={cn(
      "flex flex-col w-[calc(100vw-2rem)] md:w-80 shrink-0 snap-center rounded-xl bg-muted/50 border border-border/50 transition-all",
      isDropTarget && "ring-2 ring-primary/40 border-primary/30",
      isDragSource && "opacity-50 shadow-lg ring-2 ring-primary/30"
    )}>
      {/* Column Header */}
      <div className="flex items-center gap-2 px-3.5 py-3 border-b border-border/30">
        <div
          ref={handleRef}
          className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0 -ml-1"
          aria-label="Drag to reorder column"
        >
          <GripVertical className="size-3.5" />
        </div>
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") cancelRename()
            }}
            className="h-7 text-sm font-semibold px-1.5 bg-background"
          />
        ) : (
          <span
            className="text-sm font-semibold truncate flex-1 cursor-default select-none px-1"
            onDoubleClick={() => setIsEditing(true)}
            title="Double-click to rename"
          >
            {column.name}
          </span>
        )}

        {!isEditing && (
          <>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
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
      <div className="flex-1 min-h-[50vh] md:min-h-[200px] px-2.5 py-2.5 overflow-y-auto">
        {issues.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 text-center mt-8 select-none">
            {isDropTarget ? "Drop here" : "No issues"}
          </p>
        ) : (
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
        )}
      </div>
    </div>
  )
}
