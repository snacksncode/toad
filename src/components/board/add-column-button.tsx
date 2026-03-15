import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AddColumnButtonProps {
  onAdd: (name: string) => void
}

export function AddColumnButton({ onAdd }: AddColumnButtonProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState("")

  function handleSubmit() {
    const trimmed = name.trim()
    if (trimmed) {
      onAdd(trimmed)
      setName("")
      setIsAdding(false)
    }
  }

  function handleCancel() {
    setName("")
    setIsAdding(false)
  }

  if (isAdding) {
    return (
      <div className="flex w-72 shrink-0 flex-col gap-2 rounded-xl border border-border/50 bg-muted/50 p-3">
        <Input
          autoFocus
          placeholder="Column name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
            if (e.key === "Escape") handleCancel()
          }}
          className="h-8 text-sm"
        />
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={handleSubmit}
          >
            Add Column
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={handleCancel}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="flex min-h-[200px] w-72 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/40 text-muted-foreground transition-colors hover:border-border/70 hover:bg-muted/30 hover:text-foreground"
    >
      <Plus className="size-4" />
      <span className="text-sm font-medium">Add Column</span>
    </button>
  )
}
