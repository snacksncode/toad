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

export function IssueCard({ issue, index, columnId, onClick }: IssueCardProps) {
  const overdue = issue.due_date ? isOverdue(issue.due_date) : false

  const { ref, isDragSource } = useSortable({
    id: issue.id,
    index,
    type: "item",
    accept: ["item"],
    group: columnId,
    collisionPriority: CollisionPriority.Normal,
  })

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
      className={cn(
        "w-full text-left select-none rounded-lg border border-border/60 bg-background px-3 py-2.5 min-h-11 cursor-pointer transition-all hover:shadow-sm hover:border-border active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragSource && "opacity-50 shadow-lg ring-2 ring-primary/30 scale-[1.02]"
      )}
      style={{ touchAction: "none" }}
    >
      {/* Title + priority dot */}
      <div className="flex items-start gap-2">
        <span className="text-sm font-medium leading-snug line-clamp-2 flex-1 min-w-0">
          {issue.title}
        </span>
        <span
          className={`size-2 rounded-full shrink-0 mt-1.5 ${priorityColors[issue.priority]}`}
          title={`${issue.priority} priority`}
        />
      </div>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {issue.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="inline-block text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40 truncate max-w-[100px]"
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

      {/* Footer: due date + assignee */}
      {(issue.due_date || issue.assignee_email) && (
        <div className="flex items-center justify-between gap-2 mt-2">
          {issue.due_date ? (
            <span
              className={`text-xs tabular-nums ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}
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
    </div>
  )
}
