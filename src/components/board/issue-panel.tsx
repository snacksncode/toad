import { useState, useEffect, useRef, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Avatar } from "@/components/avatar"
import { updateIssue, deleteIssue, moveIssue } from "@/lib/queries/issues"
import type { Column, Issue, ProjectMember } from "@/lib/database.types"
import { toast } from "sonner"
import { Trash2, X, Plus } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"

interface IssuePanelProps {
  issue: Issue | null
  columns: Column[]
  members: ProjectMember[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onIssueUpdated: (issue: Issue) => void
  onIssueDeleted: (issueId: string) => void
}

export function IssuePanel({
  issue,
  columns,
  members,
  open,
  onOpenChange,
  onIssueUpdated,
  onIssueDeleted,
}: IssuePanelProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [labelInput, setLabelInput] = useState("")
  const labelInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (issue) {
      setTitle(issue.title)
      setDescription(issue.description)
    }
  }, [issue])

  const saveField = useCallback(
    async (field: string, value: unknown) => {
      if (!issue) return
      try {
        const updated = await updateIssue(issue.id, {
          [field]: value,
        })
        onIssueUpdated(updated)
      } catch {
        toast.error("Failed to save changes")
      }
    },
    [issue, onIssueUpdated]
  )

  const handleTitleBlur = useCallback(() => {
    if (!issue) return
    const trimmed = title.trim()
    if (trimmed && trimmed !== issue.title) {
      saveField("title", trimmed)
    } else {
      setTitle(issue.title)
    }
  }, [issue, title, saveField])

  const handleDescriptionBlur = useCallback(() => {
    if (!issue) return
    if (description !== issue.description) {
      saveField("description", description)
    }
  }, [issue, description, saveField])

  const handleColumnChange = useCallback(
    async (newValue: string) => {
      if (!issue) return
      const newColumnId = newValue
      if (newColumnId === issue.column_id) return
      try {
        const updated = await moveIssue(issue.id, newColumnId, 999)
        onIssueUpdated(updated)
      } catch {
        toast.error("Failed to move issue")
      }
    },
    [issue, onIssueUpdated]
  )

  const handleDelete = useCallback(async () => {
    if (!issue) return
    try {
      await deleteIssue(issue.id)
      onIssueDeleted(issue.id)
    } catch {
      toast.error("Failed to delete issue")
    }
  }, [issue, onIssueDeleted])

  const handleAddLabel = useCallback(() => {
    if (!issue) return
    const label = labelInput.trim()
    if (!label) return
    if (issue.labels.includes(label)) {
      setLabelInput("")
      return
    }
    const newLabels = [...issue.labels, label]
    setLabelInput("")
    saveField("labels", newLabels)
  }, [issue, labelInput, saveField])

  const handleRemoveLabel = useCallback(
    (label: string) => {
      if (!issue) return
      const newLabels = issue.labels.filter((l) => l !== label)
      saveField("labels", newLabels)
    },
    [issue, saveField]
  )

  if (!issue) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-y-auto sm:max-w-[480px]"
        showCloseButton
      >
        <SheetHeader className="pb-0">
          <SheetTitle className="sr-only">Edit Issue</SheetTitle>
          <SheetDescription className="sr-only">
            Edit the details of this issue
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 px-4 pb-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label
              htmlFor="issue-title"
              className="text-xs text-muted-foreground"
            >
              Title
            </Label>
            <Input
              id="issue-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur()
                }
              }}
              className="h-9 text-base font-medium"
              placeholder="Issue title"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label
              htmlFor="issue-description"
              className="text-xs text-muted-foreground"
            >
              Description
            </Label>
            <Textarea
              id="issue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Add a description…"
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <Select
              value={issue.priority}
              onValueChange={(val) =>
                saveField("priority", val as Issue["priority"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Low
                  </span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-400" />
                    Medium
                  </span>
                </SelectItem>
                <SelectItem value="high">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-red-500" />
                    High
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Column */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Column</Label>
            <Select value={issue.column_id} onValueChange={handleColumnChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Assignee</Label>
            <Select
              value={issue.assignee_email ?? "unassigned"}
              onValueChange={(val) =>
                saveField("assignee_email", val === "unassigned" ? null : val)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <span className="text-muted-foreground">Unassigned</span>
                </SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.invited_email}>
                    <span className="flex items-center gap-2">
                      <Avatar email={m.invited_email} size="sm" />
                      <span className="truncate">{m.invited_email}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label
              htmlFor="issue-due-date"
              className="text-xs text-muted-foreground"
            >
              Due date
            </Label>
            <DatePicker
              value={
                issue.due_date
                  ? new Date(issue.due_date + "T00:00:00")
                  : undefined
              }
              onChange={(date) =>
                saveField(
                  "due_date",
                  date ? date.toISOString().slice(0, 10) : null
                )
              }
              className="w-full"
            />
          </div>

          {/* Labels */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Labels</Label>
            {issue.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleRemoveLabel(label)}
                    className="group inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    title={`Remove "${label}"`}
                  >
                    {label}
                    <X className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <Input
                ref={labelInputRef}
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddLabel()
                  }
                }}
                placeholder="Add label…"
                className="h-7 flex-1 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleAddLabel}
                disabled={!labelInput.trim()}
                className="shrink-0"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer: Delete */}
        <SheetFooter className="border-t border-border/50">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full">
                <Trash2 className="size-3.5" />
                Delete Issue
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this issue?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &ldquo;{issue.title}&rdquo;. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
