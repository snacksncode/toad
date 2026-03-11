import { useState, useEffect, type ReactNode, type FormEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"
import { createIssue } from "@/lib/queries/issues"
import { getProjectMembers } from "@/lib/queries/members"
import type { Issue, ProjectMember } from "@/lib/database.types"
import { toast } from "sonner"

interface CreateIssueDialogProps {
  projectId: string
  columnId: string
  onCreated: (issue: Issue) => void
  trigger: ReactNode
}

export function CreateIssueDialog({
  projectId,
  columnId,
  onCreated,
  trigger,
}: CreateIssueDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [members, setMembers] = useState<ProjectMember[]>([])

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [labels, setLabels] = useState<string[]>([])
  const [labelInput, setLabelInput] = useState("")
  const [assigneeEmail, setAssigneeEmail] = useState<string>("")
  const [dueDate, setDueDate] = useState("")

  useEffect(() => {
    if (!open) return
    // Reset form on open
    setTitle("")
    setDescription("")
    setPriority("medium")
    setLabels([])
    setLabelInput("")
    setAssigneeEmail("")
    setDueDate("")

    // Fetch members for assignee dropdown
    getProjectMembers(projectId)
      .then(setMembers)
      .catch(() => {
        /* non-critical */
      })
  }, [open, projectId])

  function addLabel(raw: string) {
    const trimmed = raw.trim()
    if (trimmed && !labels.includes(trimmed)) {
      setLabels((prev) => [...prev, trimmed])
    }
    setLabelInput("")
  }

  function removeLabel(label: string) {
    setLabels((prev) => prev.filter((l) => l !== label))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    try {
      const issue = await createIssue({
        project_id: projectId,
        column_id: columnId,
        title: title.trim(),
        description: description.trim(),
        priority,
        labels,
        assignee_email: assigneeEmail || null,
        due_date: dueDate || null,
      })
      onCreated(issue)
      setOpen(false)
    } catch {
      toast.error("Failed to create issue")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Title */}
          <div className="grid gap-1.5">
            <Label htmlFor="issue-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="issue-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <Label htmlFor="issue-desc">Description</Label>
            <Textarea
              id="issue-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description…"
              rows={3}
            />
          </div>

          {/* Priority + Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) =>
                  setPriority(v as "low" | "medium" | "high")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="issue-due">Due date</Label>
              <Input
                id="issue-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Labels */}
          <div className="grid gap-1.5">
            <Label htmlFor="issue-labels">Labels</Label>
            <div className="flex flex-wrap gap-1 min-h-[28px]">
              {labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-muted border border-border/40"
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => removeLabel(label)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <Input
              id="issue-labels"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  (e.key === "Enter" || e.key === ",") &&
                  labelInput.trim()
                ) {
                  e.preventDefault()
                  addLabel(labelInput)
                }
              }}
              onBlur={() => {
                if (labelInput.trim()) addLabel(labelInput)
              }}
              placeholder="Type and press Enter"
            />
          </div>

          {/* Assignee */}
          <div className="grid gap-1.5">
            <Label>Assignee</Label>
            <Select value={assigneeEmail} onValueChange={setAssigneeEmail}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.invited_email}>
                    {m.invited_email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? "Creating…" : "Create Issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
