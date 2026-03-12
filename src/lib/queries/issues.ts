import { supabase } from "@/lib/supabase"
import type { Issue, IssueInsert, IssueUpdate } from "@/lib/database.types"

const ISSUE_COLUMNS =
  "id, project_id, column_id, title, description, priority, labels, assignee_email, due_date, position, created_at, updated_at"

export async function getColumnIssues(columnId: string): Promise<Issue[]> {
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUE_COLUMNS)
    .eq("column_id", columnId)
    .order("position", { ascending: true })

  if (error) throw error
  return data
}

export async function getProjectIssues(projectId: string): Promise<Issue[]> {
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUE_COLUMNS)
    .eq("project_id", projectId)
    .order("position", { ascending: true })

  if (error) throw error
  return data
}

export async function createIssue(
  input: Omit<IssueInsert, "position">
): Promise<Issue> {
  // Get next position within column or backlog
  let query = supabase
    .from("issues")
    .select("position")

  if (input.column_id) {
    query = query.eq("column_id", input.column_id)
  } else {
    query = query.is("column_id", null).eq("project_id", input.project_id)
  }

  const { data: existing } = await query
    .order("position", { ascending: false })
    .limit(1)

  const nextPosition =
    existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { data, error } = await supabase
    .from("issues")
    .insert({ ...input, position: nextPosition })
    .select(ISSUE_COLUMNS)
    .single()

  if (error) throw error
  return data
}

export async function updateIssue(
  issueId: string,
  updates: IssueUpdate
): Promise<Issue> {
  const { data, error } = await supabase
    .from("issues")
    .update(updates)
    .eq("id", issueId)
    .select(ISSUE_COLUMNS)
    .single()

  if (error) throw error
  return data
}

export async function deleteIssue(issueId: string): Promise<void> {
  const { error } = await supabase.from("issues").delete().eq("id", issueId)

  if (error) throw error
}

export async function moveIssue(
  issueId: string,
  newColumnId: string | null,
  newPosition: number
): Promise<Issue> {
  const { data, error } = await supabase
    .from("issues")
    .update({ column_id: newColumnId, position: newPosition })
    .eq("id", issueId)
    .select(ISSUE_COLUMNS)
    .single()

  if (error) throw error
  return data
}

export async function reorderIssues(
  columnId: string,
  orderedIds: string[]
): Promise<void> {
  const promises = orderedIds.map((id, index) =>
    supabase
      .from("issues")
      .update({ position: index })
      .eq("id", id)
      .eq("column_id", columnId)
  )

  const results = await Promise.all(promises)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}

export async function reorderBacklog(
  projectId: string,
  orderedIds: string[]
): Promise<void> {
  const promises = orderedIds.map((id, index) =>
    supabase
      .from("issues")
      .update({ position: index })
      .eq("id", id)
      .is("column_id", null)
      .eq("project_id", projectId)
  )

  const results = await Promise.all(promises)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}
