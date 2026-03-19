import { db } from "@/lib/db"
import type { Column } from "@/lib/database.types"

export async function getProjectColumns(projectId: string): Promise<Column[]> {
  return db.columns
    .where("project_id")
    .equals(projectId)
    .sortBy("position") as Promise<Column[]>
}

export async function createColumn(
  projectId: string,
  name: string
): Promise<Column> {
  const existing = await db.columns
    .where("project_id")
    .equals(projectId)
    .sortBy("position")
  const nextPosition =
    existing.length > 0 ? existing[existing.length - 1].position + 1 : 0

  const column: Column = {
    id: crypto.randomUUID(),
    project_id: projectId,
    name,
    position: nextPosition,
    created_at: new Date().toISOString(),
  }

  await db.columns.add(column)
  return column
}

export async function updateColumn(
  columnId: string,
  updates: { name?: string; position?: number }
): Promise<Column> {
  await db.columns.update(columnId, updates)
  const updated = await db.columns.get(columnId)
  if (!updated) throw new Error(`Column ${columnId} not found`)
  return updated as Column
}

export async function reorderColumns(
  _projectId: string,
  orderedIds: string[]
): Promise<void> {
  await db.transaction("rw", db.columns, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.columns.update(orderedIds[i], { position: i })
    }
  })
}

export async function deleteColumn(columnId: string): Promise<void> {
  await db.transaction("rw", [db.columns, db.issues], async () => {
    await db.issues.where("column_id").equals(columnId).delete()
    await db.columns.delete(columnId)
  })
}
