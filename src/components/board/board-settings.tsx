import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2, Trash2 } from "lucide-react"

interface BoardSettingsProps {
  projectId: string
  projectName: string
  onRename: (name: string) => void
  onDelete: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BoardSettings({
  projectName,
  onRename,
  onDelete,
  open,
  onOpenChange,
}: BoardSettingsProps) {
  const [name, setName] = useState(projectName)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (open) setName(projectName)
  }, [open, projectName])

  const handleSaveName = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === projectName) return
    setSaving(true)
    try {
      onRename(trimmed)
      toast.success("Board renamed")
    } catch {
      toast.error("Failed to rename board")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      onDelete()
    } catch {
      toast.error("Failed to delete board")
      setDeleting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Board Settings</SheetTitle>
          <SheetDescription>Manage your board name.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          <div className="flex flex-col gap-3">
            <Label htmlFor="board-name" className="text-sm font-medium">
              Board Name
            </Label>
            <div className="flex gap-2">
              <Input
                id="board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName()
                }}
                placeholder="Board name"
              />
              <Button
                onClick={handleSaveName}
                disabled={saving || !name.trim() || name.trim() === projectName}
                size="sm"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium text-destructive">
              Danger Zone
            </Label>
            <p className="text-sm text-muted-foreground">
              Permanently delete this board and all its data. This action cannot
              be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="mr-2 size-4" />
                  Delete Board
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Board</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &ldquo;{projectName}&rdquo; and
                    all its columns and issues. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
