import { queryOptions } from "@tanstack/react-query"
import { db } from "@/lib/db"
import { getProjectColumns } from "@/lib/queries/columns"
import { getProjectIssues } from "@/lib/queries/issues"
import { getAllProjects } from "@/lib/queries/projects"

export const boardQueries = {
  name: (boardId: string) =>
    queryOptions({
      queryKey: ["boards", boardId, "name"] as const,
      queryFn: async () => {
        const project = await db.projects.get(boardId)
        return project?.name ?? ""
      },
    }),
  columns: (boardId: string) =>
    queryOptions({
      queryKey: ["boards", boardId, "columns"] as const,
      queryFn: () => getProjectColumns(boardId),
    }),
  issues: (boardId: string) =>
    queryOptions({
      queryKey: ["boards", boardId, "issues"] as const,
      queryFn: () => getProjectIssues(boardId),
    }),
}

export const projectQueries = {
  list: () =>
    queryOptions({
      queryKey: ["projects", "list"] as const,
      queryFn: () => getAllProjects(),
    }),
}
