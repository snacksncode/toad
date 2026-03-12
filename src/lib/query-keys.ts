export const boardKeys = {
  all: ["boards"] as const,
  detail: (boardId: string) => ["boards", boardId] as const,
  columns: (boardId: string) => ["boards", boardId, "columns"] as const,
  issues: (boardId: string) => ["boards", boardId, "issues"] as const,
  members: (boardId: string) => ["boards", boardId, "members"] as const,
}

export const projectKeys = {
  all: ["projects"] as const,
  list: (userId: string) => ["projects", "list", userId] as const,
}
