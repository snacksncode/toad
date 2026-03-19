import { useCallback } from "react"
import { useSortable } from "@dnd-kit/react/sortable"
import { CollisionPriority } from "@dnd-kit/abstract"
import {
  Circle,
  CircleCheck,
  ExternalLink,
  FolderInput,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useIssueMutations } from "@/hooks/use-issue-mutations"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { Column as ColumnType, Issue } from "@/lib/database.types"

interface IssueCardProps {
  issue: Issue
  index: number
  columnId: string
  allColumns: ColumnType[]
  onClick?: () => void
}

interface IssueCardContentProps {
  issue: Issue
  overdue: boolean
  onToggleComplete?: (e: React.MouseEvent) => void
}

const priorityColors: Record<Issue["priority"], string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-emerald-500",
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function isOverdue(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + "T00:00:00")
  return due < today
}

export function IssueCardContent({
  issue,
  overdue,
  onToggleComplete,
}: IssueCardContentProps) {
  const completed = issue.completed

  const completionIcon = completed ? (
    <CircleCheck className="size-4 text-emerald-500" />
  ) : (
    <Circle className="size-4 text-muted-foreground/30" />
  )

  return (
    <>
      <div className="flex items-start gap-2">
        {onToggleComplete ? (
          <button
            type="button"
            onClick={onToggleComplete}
            className="mt-0.5 shrink-0 rounded-full transition-colors hover:text-emerald-500"
          >
            {completionIcon}
          </button>
        ) : (
          <span className="mt-0.5 shrink-0">{completionIcon}</span>
        )}
        <span
          className={cn(
            "line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-medium",
            completed && "text-muted-foreground line-through"
          )}
        >
          {issue.title}
        </span>
        <span
          className={`mt-1 size-2.5 shrink-0 rounded-full ${priorityColors[issue.priority]}`}
          title={`${issue.priority} priority`}
        />
      </div>

      {issue.labels.length > 0 && (
        <div
          className={cn("mt-2 flex flex-wrap gap-1", completed && "opacity-50")}
        >
          {issue.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="inline-block max-w-[100px] truncate rounded-full border border-border/40 bg-muted px-2 py-0.5 text-[11px] leading-none text-muted-foreground"
            >
              {label}
            </span>
          ))}
          {issue.labels.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{issue.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {issue.due_date && (
        <div className="mt-2">
          <span
            className={cn(
              "text-xs tabular-nums",
              completed
                ? "text-muted-foreground"
                : overdue
                  ? "font-medium text-red-500"
                  : "text-muted-foreground"
            )}
          >
            {formatDueDate(issue.due_date)}
          </span>
        </div>
      )}
    </>
  )
}

export function IssueCard({
  issue,
  index,
  columnId,
  allColumns,
  onClick,
}: IssueCardProps) {
  const overdue =
    issue.due_date && !issue.completed ? isOverdue(issue.due_date) : false
  const { toggleComplete, move, remove } = useIssueMutations(issue.project_id)

  const handleToggleComplete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      toggleComplete.mutate(issue)
    },
    [issue, toggleComplete]
  )

  const { ref, isDragSource } = useSortable({
    id: issue.id,
    index,
    type: "item",
    accept: ["item"],
    group: columnId,
    collisionPriority: CollisionPriority.Normal,
    transition: { duration: 250, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
  })

  const otherColumns = allColumns.filter((c) => c.id !== columnId)
  const isMobile = useIsMobile()

  const cardEl = (
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
        "flex min-h-12 w-full cursor-pointer flex-col justify-center rounded-lg border border-border/60 bg-background px-3.5 py-3 text-left transition-all select-none hover:border-border hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98]",
        isDragSource && "opacity-40"
      )}
      style={{ touchAction: "manipulation" }}
    >
      <IssueCardContent
        issue={issue}
        overdue={overdue}
        onToggleComplete={handleToggleComplete}
      />
    </div>
  )

  if (isMobile) return cardEl

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{cardEl}</ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={onClick}>
          <ExternalLink className="size-3.5" />
          Open
        </ContextMenuItem>
        <ContextMenuItem onClick={() => toggleComplete.mutate(issue)}>
          {issue.completed ? (
            <Circle className="size-3.5" />
          ) : (
            <CircleCheck className="size-3.5" />
          )}
          {issue.completed ? "Reopen" : "Mark as complete"}
        </ContextMenuItem>

        {otherColumns.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <FolderInput className="size-3.5" />
              Move to column
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-44">
              {otherColumns.map((col) => (
                <ContextMenuItem
                  key={col.id}
                  onClick={() =>
                    move.mutate({
                      id: issue.id,
                      columnId: col.id,
                      position: 9999,
                    })
                  }
                >
                  {col.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onClick={() => remove.mutate(issue.id)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function IssueCardOverlay({ issue }: { issue: Issue }) {
  const overdue =
    issue.due_date && !issue.completed ? isOverdue(issue.due_date) : false

  return (
    <div className="w-[calc(100vw-2rem)] scale-[1.02] cursor-grabbing rounded-lg border border-border/60 bg-background px-3.5 py-3 text-left shadow-xl select-none md:w-80">
      <IssueCardContent issue={issue} overdue={overdue} />
    </div>
  )
}
