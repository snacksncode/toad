import { queryOptions } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { getProjectColumns } from "@/lib/queries/columns"
import { getProjectIssues } from "@/lib/queries/issues"
import { getProjectMembers } from "@/lib/queries/members"
import { getUserProjects } from "@/lib/queries/projects"

export const boardQueries = {
  name: (boardId: string) =>
    queryOptions({
      queryKey: ["boards", boardId, "name"] as const,
      queryFn: async () => {
        const { data } = await supabase
          .from("projects")
          .select("name")
          .eq("id", boardId)
          .single()
        return data?.name ?? ""
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
  members: (boardId: string) =>
    queryOptions({
      queryKey: ["boards", boardId, "members"] as const,
      queryFn: () => getProjectMembers(boardId),
    }),
}

export const projectQueries = {
  list: (userId: string) =>
    queryOptions({
      queryKey: ["projects", "list", userId] as const,
      queryFn: () => getUserProjects(userId),
    }),
}
