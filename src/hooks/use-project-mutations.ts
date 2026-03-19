import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import {
  createProject,
  updateProject,
  deleteProject,
} from "@/lib/queries/projects"
import { projectQueries, boardQueries } from "@/lib/query-keys"
import { toast } from "sonner"

export function useProjectMutations() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const create = useMutation({
    mutationFn: (name: string) => createProject(name),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: projectQueries.list().queryKey })
      toast.success("Board created!")
      navigate({ to: "/board/$boardId", params: { boardId: project.id } })
    },
    onError: () => toast.error("Failed to create board"),
  })

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateProject(id, name),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: projectQueries.list().queryKey })
      qc.invalidateQueries({ queryKey: boardQueries.name(id).queryKey })
      toast.success("Board renamed")
    },
    onError: () => toast.error("Failed to rename board"),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: projectQueries.list().queryKey })
      qc.removeQueries({ queryKey: ["boards", id] })
    },
    onError: () => toast.error("Failed to delete board"),
  })

  return { create, rename, remove }
}
