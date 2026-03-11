import { useState, useEffect, useCallback } from "react"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"
import { AppHeader } from "@/components/layout/header"
import { useAuth } from "@/hooks/use-auth"
import { BoardCard } from "@/components/board-card"
import { CreateBoardDialog } from "@/components/create-board-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getUserProjects,
  createProject,
  type ProjectWithMemberCount,
} from "@/lib/queries/projects"
import { toast } from "sonner"
import { Plus, Kanban } from "lucide-react"

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: "/login" })
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectWithMemberCount[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchProjects = useCallback(async () => {
    if (!user) return
    try {
      const data = await getUserProjects(user.id)
      setProjects(data)
    } catch {
      toast.error("Failed to load boards")
    }
  }, [user])

  useEffect(() => {
    setLoading(true)
    fetchProjects().finally(() => setLoading(false))
  }, [fetchProjects])

  async function handleCreateBoard(name: string) {
    if (!user) return
    try {
      const project = await createProject(name, user.id, user.email ?? "")
      toast.success("Board created!")
      await fetchProjects()
      navigate({ to: "/board/$boardId", params: { boardId: project.id } })
    } catch {
      toast.error("Failed to create board")
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1 container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Boards</h1>
          <CreateBoardDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onCreateBoard={handleCreateBoard}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                New Board
              </Button>
            }
          />
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mb-4">
              <Kanban className="size-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No boards yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Create your first board to start organizing your tasks and
              collaborate with your team.
            </p>
            <CreateBoardDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onCreateBoard={handleCreateBoard}
              trigger={
                <Button>
                  <Plus className="size-4" />
                  Create your first board
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <BoardCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
