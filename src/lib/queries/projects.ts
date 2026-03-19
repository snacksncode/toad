import { db } from "@/lib/db"
import type { Project } from "@/lib/database.types"

export async function getAllProjects(): Promise<Project[]> {
  return db.projects.orderBy("created_at").reverse().toArray() as Promise<
    Project[]
  >
}

export async function createProject(name: string): Promise<Project> {
  const now = new Date().toISOString()
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    created_at: now,
  }

  await db.transaction("rw", [db.projects, db.columns], async () => {
    await db.projects.add(project)
    await db.columns.bulkAdd([
      {
        id: crypto.randomUUID(),
        project_id: project.id,
        name: "To Do",
        position: 0,
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        project_id: project.id,
        name: "In Progress",
        position: 1,
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        project_id: project.id,
        name: "Done",
        position: 2,
        created_at: now,
      },
    ])
  })

  return project
}

export async function updateProject(
  projectId: string,
  name: string
): Promise<void> {
  await db.projects.update(projectId, { name })
}

export async function deleteProject(projectId: string): Promise<void> {
  await db.transaction("rw", [db.projects, db.columns, db.issues], async () => {
    await db.projects.delete(projectId)
    await db.columns.where("project_id").equals(projectId).delete()
    await db.issues.where("project_id").equals(projectId).delete()
  })
}
