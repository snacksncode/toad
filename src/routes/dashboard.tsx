import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { Kanban, Plus, Sparkles } from "lucide-react"
import { projectQueries } from "@/lib/query-keys"
import { AppHeader } from "@/components/layout/header"
import { BoardCard } from "@/components/board-card"
import { CreateBoardDialog } from "@/components/create-board-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createProject } from "@/lib/queries/projects"
import { useProjectMutations } from "@/hooks/use-project-mutations"
import { db } from "@/lib/db"
import type { Issue } from "@/lib/database.types"

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
})

function DashboardPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const {
    create: createBoard,
    rename: renameBoard,
    remove: removeBoard,
  } = useProjectMutations()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: projects = [], isLoading } = useQuery(projectQueries.list())

  async function handleCreateDemoBoard() {
    try {
      const project = await createProject("Demo Board")
      const columns = await db.columns
        .where("project_id")
        .equals(project.id)
        .sortBy("position")

      const [todo, inProgress, done] = columns
      const now = new Date().toISOString()
      const today = new Date()
      const daysAgo = (n: number) => {
        const d = new Date(today)
        d.setDate(d.getDate() - n)
        return d.toISOString().split("T")[0]
      }
      const daysFromNow = (n: number) => {
        const d = new Date(today)
        d.setDate(d.getDate() + n)
        return d.toISOString().split("T")[0]
      }

      const issues: Issue[] = [
        {
          id: crypto.randomUUID(),
          project_id: project.id,
          column_id: todo.id,
          title: "Design landing page mockup",
          description:
            "Create wireframes and high-fidelity mockups for the new landing page.",
          priority: "high",
          labels: ["design", "marketing"],
          due_date: daysFromNow(3),
          completed: false,
          position: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: crypto.randomUUID(),
          project_id: project.id,
          column_id: todo.id,
          title: "Write API documentation",
          description: "",
          priority: "medium",
          labels: ["docs"],
          due_date: daysFromNow(7),
          completed: false,
          position: 1,
          created_at: now,
          updated_at: now,
        },
        {
          id: crypto.randomUUID(),
          project_id: project.id,
          column_id: todo.id,
          title: "Set up CI/CD pipeline",
          description: "",
          priority: "low",
          labels: ["devops"],
          due_date: null,
          completed: false,
          position: 2,
          created_at: now,
          updated_at: now,
        },
        {
          id: crypto.randomUUID(),
          project_id: project.id,
          column_id: inProgress.id,
          title: "Implement dark mode toggle",
          description:
            "Add theme switching support with system preference detection.",
          priority: "medium",
          labels: ["frontend", "ux"],
          due_date: daysFromNow(1),
          completed: false,
          position: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: crypto.randomUUID(),
          project_id: project.id,
          column_id: inProgress.id,
          title: "Fix mobile nav overflow",
          description: "",
          priority: "high",
          labels: ["bug", "mobile"],
          due_date: daysAgo(1),
          completed: false,
          position: 1,
          created_at: now,
          updated_at: now,
        },
        {
          id: crypto.randomUUID(),
          project_id: project.id,
          column_id: done.id,
          title: "Set up project repo",
          description: "",
          priority: "high",
          labels: ["devops"],
          due_date: daysAgo(5),
          completed: true,
          position: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: crypto.randomUUID(),
          project_id: project.id,
          column_id: done.id,
          title: "Create color palette",
          description: "",
          priority: "medium",
          labels: ["design"],
          due_date: daysAgo(3),
          completed: true,
          position: 1,
          created_at: now,
          updated_at: now,
        },
      ]

      await db.issues.bulkAdd(issues)

      toast.success("Demo board created!")
      qc.invalidateQueries({ queryKey: projectQueries.list().queryKey })
      navigate({ to: "/board/$boardId", params: { boardId: project.id } })
    } catch {
      toast.error("Failed to create demo board")
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCreateDemoBoard}>
              <Sparkles className="size-4" />
              Demo Board
            </Button>
            <CreateBoardDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onCreateBoard={async (name) => {
                await createBoard.mutateAsync(name)
              }}
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  New Board
                </Button>
              }
            />
          </div>
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
            <div className="flex gap-3">
              <CreateBoardDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onCreateBoard={async (name) => {
                  await createBoard.mutateAsync(name)
                }}
                trigger={
                  <Button>
                    <Plus className="size-4" />
                    Create your first board
                  </Button>
                }
              />
              <Button variant="outline" onClick={handleCreateDemoBoard}>
                <Sparkles className="size-4" />
                Try a demo board
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <BoardCard
                key={project.id}
                project={project}
                onRename={(name) =>
                  renameBoard.mutate({ id: project.id, name })
                }
                onDelete={() => removeBoard.mutate(project.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
