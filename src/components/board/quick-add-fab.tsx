import { useState, type FormEvent } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createIssue } from "@/lib/queries/issues"
import type { Column, Issue } from "@/lib/database.types"
import { toast } from "sonner"

interface QuickAddFabProps {
  columns: Column[]
  projectId: string
  onCreated: (issue: Issue) => void
}

export function QuickAddFab({
  columns,
  projectId,
  onCreated,
}: QuickAddFabProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [selectedColumnId, setSelectedColumnId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function handleOpen() {
    setTitle("")
    setSelectedColumnId(columns[0]?.id ?? "")
    setOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || !selectedColumnId) return

    setSubmitting(true)
    try {
      const issue = await createIssue({
        column_id: selectedColumnId,
        project_id: projectId,
        title: trimmed,
        priority: "medium",
        labels: [],
      })
      onCreated(issue)
      setOpen(false)
    } catch {
      toast.error("Failed to create issue")
    } finally {
      setSubmitting(false)
    }
  }

  if (columns.length === 0) return null

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-4 right-4 z-50 md:hidden size-12 rounded-full shadow-lg"
        onClick={handleOpen}
        aria-label="Quick add issue"
      >
        <Plus className="size-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Quick Add Issue</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="fab-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fab-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Issue title"
                autoFocus
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Column</Label>
              <Select
                value={selectedColumnId}
                onValueChange={setSelectedColumnId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column" />
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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !title.trim() || !selectedColumnId}
              >
                {submitting ? "Creating…" : "Create Issue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
