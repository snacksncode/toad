import { useState, useRef, useEffect } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AddColumnButtonProps {
  onAdd: (name: string) => void
}

export function AddColumnButton({ onAdd }: AddColumnButtonProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

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
      <div className="flex flex-col w-72 shrink-0 rounded-xl bg-muted/50 border border-border/50 p-3 gap-2">
        <Input
          ref={inputRef}
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
          <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSubmit}>
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
      className="flex items-center justify-center w-72 shrink-0 min-h-[200px] rounded-xl border-2 border-dashed border-border/40 hover:border-border/70 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground cursor-pointer gap-2"
    >
      <Plus className="size-4" />
      <span className="text-sm font-medium">Add Column</span>
    </button>
  )
}
