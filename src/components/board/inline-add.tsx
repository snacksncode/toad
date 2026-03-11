import { useState, useRef, useEffect } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createIssue } from "@/lib/queries/issues"
import type { Issue } from "@/lib/database.types"
import { toast } from "sonner"

interface InlineAddProps {
  columnId: string
  projectId: string
  onCreated: (issue: Issue) => void
}

export function InlineAdd({ columnId, projectId, onCreated }: InlineAddProps) {
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
        column_id: columnId,
        project_id: projectId,
        title: trimmed,
        priority: "medium",
        labels: [],
      })
      onCreated(issue)
      setTitle("")
      // Stay expanded for rapid entry
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
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-foreground h-7 text-xs"
        onClick={() => setExpanded(true)}
      >
        <Plus className="size-3" />
        Add issue
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1">
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
        className="h-7 text-xs flex-1"
      />
      {submitting && (
        <Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0" />
      )}
    </div>
  )
}
