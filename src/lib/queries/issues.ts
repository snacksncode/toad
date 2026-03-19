import { db } from "@/lib/db"
import type { Issue, IssueInsert, IssueUpdate } from "@/lib/database.types"

export async function getProjectIssues(projectId: string): Promise<Issue[]> {
  const rows = await db.issues
    .where("project_id")
    .equals(projectId)
    .sortBy("position")
  return rows as Issue[]
}

export async function createIssue(
  input: Omit<IssueInsert, "position">
): Promise<Issue> {
  const existing = await db.issues
    .where("column_id")
    .equals(input.column_id)
    .sortBy("position")
  const nextPosition =
    existing.length > 0 ? existing[existing.length - 1].position + 1 : 0

  const now = new Date().toISOString()
  const issue: Issue = {
    id: input.id ?? crypto.randomUUID(),
    project_id: input.project_id,
    column_id: input.column_id,
    title: input.title,
    description: input.description ?? "",
    priority: input.priority ?? "medium",
    labels: input.labels ?? [],
    due_date: input.due_date ?? null,
    completed: input.completed ?? false,
    position: nextPosition,
    created_at: input.created_at ?? now,
    updated_at: input.updated_at ?? now,
  }

  await db.issues.add(issue)
  return issue
}

export async function updateIssue(
  issueId: string,
  updates: IssueUpdate
): Promise<Issue> {
  await db.issues.update(issueId, {
    ...updates,
    updated_at: new Date().toISOString(),
  })
  const updated = await db.issues.get(issueId)
  if (!updated) throw new Error(`Issue ${issueId} not found`)
  return updated as Issue
}

export async function deleteIssue(issueId: string): Promise<void> {
  await db.issues.delete(issueId)
}

export async function moveIssue(
  issueId: string,
  newColumnId: string,
  newPosition: number
): Promise<Issue> {
  await db.issues.update(issueId, {
    column_id: newColumnId,
    position: newPosition,
    updated_at: new Date().toISOString(),
  })
  const updated = await db.issues.get(issueId)
  if (!updated) throw new Error(`Issue ${issueId} not found`)
  return updated as Issue
}

export async function reorderIssues(
  _columnId: string,
  orderedIds: string[]
): Promise<void> {
  await db.transaction("rw", db.issues, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.issues.update(orderedIds[i], { position: i })
    }
  })
}
