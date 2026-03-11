import { supabase } from "@/lib/supabase"
import type { Column } from "@/lib/database.types"

export async function getProjectColumns(projectId: string): Promise<Column[]> {
  const { data, error } = await supabase
    .from("columns")
    .select("id, project_id, name, position, created_at")
    .eq("project_id", projectId)
    .order("position", { ascending: true })

  if (error) throw error
  return data
}

export async function createColumn(
  projectId: string,
  name: string
): Promise<Column> {
  // Get max position to append at the end
  const { data: existing } = await supabase
    .from("columns")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)

  const nextPosition =
    existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { data, error } = await supabase
    .from("columns")
    .insert({ project_id: projectId, name, position: nextPosition })
    .select("id, project_id, name, position, created_at")
    .single()

  if (error) throw error
  return data
}

export async function updateColumn(
  columnId: string,
  updates: { name?: string; position?: number }
): Promise<Column> {
  const { data, error } = await supabase
    .from("columns")
    .update(updates)
    .eq("id", columnId)
    .select("id, project_id, name, position, created_at")
    .single()

  if (error) throw error
  return data
}

export async function reorderColumns(
  projectId: string,
  orderedIds: string[]
): Promise<void> {
  // Update each column's position individually
  const promises = orderedIds.map((id, index) =>
    supabase
      .from("columns")
      .update({ position: index })
      .eq("id", id)
      .eq("project_id", projectId)
  )

  const results = await Promise.all(promises)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}

export async function deleteColumn(columnId: string): Promise<void> {
  const { error } = await supabase
    .from("columns")
    .delete()
    .eq("id", columnId)

  if (error) throw error
}
