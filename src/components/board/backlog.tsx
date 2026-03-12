import { useState, useRef, useEffect } from "react"
import { useSortable } from "@dnd-kit/react/sortable"
import { useDroppable } from "@dnd-kit/react"
import { CollisionPriority } from "@dnd-kit/abstract"
import { skipSelfCollision } from "@/lib/dnd-collision"
import { Plus, Loader2, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createIssue } from "@/lib/queries/issues"
import type { Issue } from "@/lib/database.types"
import { toast } from "sonner"

const BACKLOG_GROUP = "backlog"

// --- Backlog card (compact, sortable) ---

const priorityDot: Record<Issue["priority"], string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-emerald-500",
}

function BacklogCard({
  issue,
  index,
  onClick,
}: {
  issue: Issue
  index: number
  onClick?: () => void
}) {
  const { ref, isDragSource } = useSortable({
    id: issue.id,
    index,
    type: "item",
    accept: ["item"],
    group: BACKLOG_GROUP,
    collisionPriority: CollisionPriority.Normal,
    collisionDetector: skipSelfCollision,
  })

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        "shrink-0 flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-xs cursor-pointer select-none transition-all hover:shadow-sm hover:border-border max-w-[220px]",
        isDragSource && "opacity-40"
      )}
      style={{ touchAction: "none" }}
    >
      <span
        className={`size-1.5 rounded-full shrink-0 ${priorityDot[issue.priority]}`}
      />
      <span className="truncate">{issue.title}</span>
    </div>
  )
}

// --- Presentational backlog card for DragOverlay ---

export function BacklogCardOverlay({ issue }: { issue: Issue }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-xs shadow-sm cursor-grabbing max-w-[220px]">
      <span
        className={`size-1.5 rounded-full shrink-0 ${priorityDot[issue.priority]}`}
      />
      <span className="truncate">{issue.title}</span>
    </div>
  )
}

// --- Inline add for backlog ---

function BacklogInlineAdd({
  projectId,
  onCreated,
}: {
  projectId: string
  onCreated: (issue: Issue) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [expanded])

  function collapse() {
    setTitle("")
    setExpanded(false)
  }

  async function submit() {
    const trimmed = title.trim()
    if (!trimmed) {
      collapse()
      return
    }

    setSubmitting(true)
    try {
      const issue = await createIssue({
        project_id: projectId,
        title: trimmed,
        priority: "medium",
        labels: [],
      })
      onCreated(issue)
      setTitle("")
      inputRef.current?.focus()
    } catch {
      toast.error("Failed to create issue")
    } finally {
      setSubmitting(false)
    }
  }

  if (!expanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 h-7 text-xs gap-1 text-muted-foreground"
        onClick={() => setExpanded(true)}
      >
        <Plus className="size-3" />
        Add
      </Button>
    )
  }

  return (
    <div className="shrink-0 flex items-center gap-1">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            submit()
          }
          if (e.key === "Escape") collapse()
        }}
        onBlur={() => {
          if (!title.trim()) collapse()
        }}
        placeholder="Issue title…"
        disabled={submitting}
        className="h-7 text-xs w-40"
      />
      {submitting && (
        <Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0" />
      )}
    </div>
  )
}

// --- Backlog strip ---

interface BacklogProps {
  issues: Issue[]
  projectId: string
  onIssueCreated: (issue: Issue) => void
  onIssueClick?: (issue: Issue) => void
}

export function Backlog({
  issues,
  projectId,
  onIssueCreated,
  onIssueClick,
}: BacklogProps) {
  // Make the backlog strip itself a drop target for when it's empty
  // or when dragging over the strip background (not over a card)
  const { ref: dropRef, isDropTarget } = useDroppable({
    id: BACKLOG_GROUP,
    accept: ["item"],
    collisionPriority: CollisionPriority.Low,
  })

  return (
    <div
      ref={dropRef}
      className={cn(
        "flex items-center gap-2 px-4 sm:px-6 py-2.5 border-b overflow-x-auto overflow-y-hidden scrollbar-thin shrink-0",
        isDropTarget && "bg-primary/5"
      )}
    >
      <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
        <Inbox className="size-3.5" />
        <span className="text-xs font-medium">Backlog</span>
        <span className="text-[10px] tabular-nums">({issues.length})</span>
      </div>

      {issues.length === 0 && !isDropTarget && (
        <span className="text-[11px] text-muted-foreground/50 shrink-0 select-none">
          Add issues here, then drag to columns
        </span>
      )}

      {issues.map((issue, index) => (
        <BacklogCard
          key={issue.id}
          issue={issue}
          index={index}
          onClick={() => onIssueClick?.(issue)}
        />
      ))}

      <BacklogInlineAdd projectId={projectId} onCreated={onIssueCreated} />
    </div>
  )
}
