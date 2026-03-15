import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"
import { queryClient } from "@/lib/query-client"
import { projectQueries } from "@/lib/query-keys"
import { AppHeader } from "@/components/layout/header"
import { useAuth } from "@/hooks/use-auth"
import { BoardCard } from "@/components/board-card"
import { CreateBoardDialog } from "@/components/create-board-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createProject } from "@/lib/queries/projects"
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
  loader: async () => {
    const user = queryClient.getQueryData<{ id: string } | null>([
      "auth",
      "user",
    ])
    if (user) {
      await queryClient.ensureQueryData(projectQueries.list(user.id))
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: projects = [], isLoading } = useQuery({
    ...projectQueries.list(user?.id ?? ""),
    enabled: !!user,
  })

  async function handleCreateBoard(name: string) {
    if (!user) return
    try {
      const project = await createProject(name, user.id, user.email ?? "")
      toast.success("Board created!")
      qc.invalidateQueries({ queryKey: projectQueries.list(user.id).queryKey })
      navigate({ to: "/board/$boardId", params: { boardId: project.id } })
    } catch {
      toast.error("Failed to create board")
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="container mx-auto flex-1 p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="container mx-auto flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
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

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
              <Kanban className="size-8 text-muted-foreground" />
            </div>
            <h2 className="mb-1 text-lg font-semibold">No boards yet</h2>
            <p className="mb-6 max-w-xs text-sm text-muted-foreground">
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
