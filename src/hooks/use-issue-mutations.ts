import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createIssue,
  updateIssue,
  deleteIssue,
  moveIssue,
} from "@/lib/queries/issues"
import { boardQueries } from "@/lib/query-keys"
import type { Issue, IssueUpdate } from "@/lib/database.types"
import { toast } from "sonner"

export function useIssueMutations(boardId: string) {
  const qc = useQueryClient()

  const invalidateIssues = () =>
    qc.invalidateQueries({ queryKey: boardQueries.issues(boardId).queryKey })

  const create = useMutation({
    mutationFn: (input: Parameters<typeof createIssue>[0]) =>
      createIssue(input),
    onSuccess: invalidateIssues,
    onError: () => toast.error("Failed to create issue"),
  })

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: IssueUpdate }) =>
      updateIssue(id, updates),
    onSuccess: invalidateIssues,
    onError: () => toast.error("Failed to update issue"),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteIssue(id),
    onSuccess: invalidateIssues,
    onError: () => toast.error("Failed to delete issue"),
  })

  const move = useMutation({
    mutationFn: ({
      id,
      columnId,
      position,
    }: {
      id: string
      columnId: string
      position: number
    }) => moveIssue(id, columnId, position),
    onSuccess: invalidateIssues,
    onError: () => toast.error("Failed to move issue"),
  })

  const toggleComplete = useMutation({
    mutationFn: (issue: Issue) =>
      updateIssue(issue.id, { completed: !issue.completed }),
    onMutate: async (issue) => {
      await qc.cancelQueries({
        queryKey: boardQueries.issues(boardId).queryKey,
      })
      const prev = qc.getQueryData<Issue[]>(
        boardQueries.issues(boardId).queryKey
      )
      qc.setQueryData<Issue[]>(boardQueries.issues(boardId).queryKey, (old) =>
        old?.map((i) =>
          i.id === issue.id ? { ...i, completed: !issue.completed } : i
        )
      )
      return { prev }
    },
    onError: (_err, _issue, context) => {
      if (context?.prev) {
        qc.setQueryData(boardQueries.issues(boardId).queryKey, context.prev)
      }
    },
    onSettled: invalidateIssues,
  })

  return { create, update, remove, move, toggleComplete }
}
