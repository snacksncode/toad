import { useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Calendar, Pencil, Trash2 } from "lucide-react"
import type { Project } from "@/lib/database.types"

interface BoardCardProps {
  project: Project
  onRename: (name: string) => void
  onDelete: () => void
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function BoardCard({ project, onRename, onDelete }: BoardCardProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(project.name)

  const handleRenameSubmit = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== project.name) {
      onRename(trimmed)
    }
    setRenameOpen(false)
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Link
            to="/board/$boardId"
            params={{ boardId: project.id }}
            className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="cursor-pointer transition-all hover:shadow-md hover:ring-foreground/20">
              <CardHeader>
                <CardTitle className="truncate">{project.name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {formatDate(project.created_at)}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-44">
          <ContextMenuItem
            onClick={() => {
              setName(project.name)
              setRenameOpen(true)
            }}
          >
            <Pencil className="size-3.5" />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={renameOpen} onOpenChange={setRenameOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Board</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for this board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit()
            }}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRenameSubmit}
              disabled={!name.trim() || name.trim() === project.name}
            >
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{project.name}&rdquo; and all
              its columns and issues. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => onDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
