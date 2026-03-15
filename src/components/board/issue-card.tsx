import { useSortable } from "@dnd-kit/react/sortable"
import { CollisionPriority } from "@dnd-kit/abstract"
import { Avatar } from "@/components/avatar"
import { cn } from "@/lib/utils"
import type { Issue } from "@/lib/database.types"

interface IssueCardProps {
  issue: Issue
  index: number
  columnId: string
  onClick?: () => void
}

interface IssueCardContentProps {
  issue: Issue
  overdue: boolean
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

/**
 * Shared rendering logic for issue card content.
 * Used by both IssueCard and IssueCardOverlay.
 */
export function IssueCardContent({ issue, overdue }: IssueCardContentProps) {
  return (
    <>
      <div className="flex items-start gap-2">
        <span className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-medium">
          {issue.title}
        </span>
        <span
          className={`mt-1 size-2.5 shrink-0 rounded-full ${priorityColors[issue.priority]}`}
          title={`${issue.priority} priority`}
        />
      </div>

      {issue.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
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

      {(issue.due_date || issue.assignee_email) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {issue.due_date ? (
            <span
              className={`text-xs tabular-nums ${overdue ? "font-medium text-red-500" : "text-muted-foreground"}`}
            >
              {formatDueDate(issue.due_date)}
            </span>
          ) : (
            <span />
          )}
          {issue.assignee_email && (
            <Avatar email={issue.assignee_email} size="sm" />
          )}
        </div>
      )}
    </>
  )
}

export function IssueCard({ issue, index, columnId, onClick }: IssueCardProps) {
  const overdue = issue.due_date ? isOverdue(issue.due_date) : false

  const { ref, isDragSource } = useSortable({
    id: issue.id,
    index,
    type: "item",
    accept: ["item"],
    group: columnId,
    collisionPriority: CollisionPriority.Normal,
    transition: { duration: 250, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
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
        "min-h-[44px] w-full cursor-pointer rounded-lg border border-border/60 bg-background px-3.5 py-3 text-left transition-all select-none hover:border-border hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98]",
        isDragSource && "opacity-40"
      )}
      style={{ touchAction: "none" }}
    >
      <IssueCardContent issue={issue} overdue={overdue} />
    </div>
  )
}

export function IssueCardOverlay({ issue }: { issue: Issue }) {
  const overdue = issue.due_date ? isOverdue(issue.due_date) : false

  return (
    <div className="w-[calc(100vw-2rem)] scale-[1.02] cursor-grabbing rounded-lg border border-border/60 bg-background px-3.5 py-3 text-left shadow-xl select-none md:w-80">
      <IssueCardContent issue={issue} overdue={overdue} />
    </div>
  )
}
