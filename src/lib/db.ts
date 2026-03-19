import Dexie, { type EntityTable } from "dexie"

export interface DbProject {
  id: string
  name: string
  created_at: string
}

export interface DbColumn {
  id: string
  project_id: string
  name: string
  position: number
  created_at: string
}

export interface DbIssue {
  id: string
  project_id: string
  column_id: string
  title: string
  description: string
  priority: "low" | "medium" | "high"
  labels: string[]
  due_date: string | null
  completed: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface DbSettings {
  id: number
  theme: string
  color_mode: "light" | "dark"
}

class ToadDatabase extends Dexie {
  projects!: EntityTable<DbProject, "id">
  columns!: EntityTable<DbColumn, "id">
  issues!: EntityTable<DbIssue, "id">
  settings!: EntityTable<DbSettings, "id">

  constructor() {
    super("toad")
    this.version(1).stores({
      projects: "&id, created_at",
      columns: "&id, project_id, position",
      issues: "&id, project_id, column_id, position",
      settings: "++id",
    })
  }
}

export const db = new ToadDatabase()
