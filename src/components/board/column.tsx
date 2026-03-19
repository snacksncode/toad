import { useState, useCallback } from "react"

import {
  MoreVertical,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Pencil,
  GripVertical,
  Plus,
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { IssueCard } from "@/components/board/issue-card"
import { cn } from "@/lib/utils"
import { useIssueMutations } from "@/hooks/use-issue-mutations"
import type { Column as ColumnType, Issue } from "@/lib/database.types"

interface ColumnProps {
  column: ColumnType
  index: number
  issues: Issue[]
  isFirst: boolean
  isLast: boolean
  projectId: string
  allColumns: ColumnType[]
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
  projectId,
  allColumns,
  onRename,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onIssueClick,
}: ColumnProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(column.name)
  const [isAddingIssue, setIsAddingIssue] = useState(false)
  const [newIssueTitle, setNewIssueTitle] = useState("")
  const { create: createIssueMutation } = useIssueMutations(projectId)

  const handleAddIssueSubmit = useCallback(async () => {
    const trimmed = newIssueTitle.trim()
    if (!trimmed) return
    try {
      await createIssueMutation.mutateAsync({
        title: trimmed,
        column_id: column.id,
        project_id: projectId,
      })
      setNewIssueTitle("")
      setIsAddingIssue(false)
    } catch {
      // Hook's onError handles the toast
    }
  }, [newIssueTitle, createIssueMutation, column.id, projectId])

  const handleAddIssueCancel = useCallback(() => {
    setNewIssueTitle("")
    setIsAddingIssue(false)
  }, [])

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
    <ContextMenu>
      <ContextMenuTrigger asChild>
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
                    <DropdownMenuItem onClick={onDelete} variant="destructive">
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
            {issues.length === 0 && !isAddingIssue && (
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
                  allColumns={allColumns}
                  onClick={() => onIssueClick?.(issue)}
                />
              ))}
            </div>
          </div>

          {/* Add Issue */}
          <div className="px-2.5 pb-2.5">
            {isAddingIssue ? (
              <Input
                ref={(node) => {
                  if (node) requestAnimationFrame(() => node.focus())
                }}
                placeholder="Issue title…"
                value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddIssueSubmit()
                  if (e.key === "Escape") handleAddIssueCancel()
                }}
                onBlur={handleAddIssueCancel}
                disabled={createIssueMutation.isPending}
                className="h-8 text-sm"
              />
            ) : (
              <button
                onClick={() => setIsAddingIssue(true)}
                className="flex w-full items-center gap-1.5 rounded-md px-3 py-2 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              >
                <Plus className="size-3" />
                Add issue
              </button>
            )}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => setIsEditing(true)}>
          <Pencil className="size-3.5" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setIsAddingIssue(true)}>
          <Plus className="size-3.5" />
          Add issue
        </ContextMenuItem>
        <ContextMenuItem onClick={onMoveLeft} disabled={isFirst}>
          <ArrowLeft className="size-3.5" />
          Move left
        </ContextMenuItem>
        <ContextMenuItem onClick={onMoveRight} disabled={isLast}>
          <ArrowRight className="size-3.5" />
          Move right
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
