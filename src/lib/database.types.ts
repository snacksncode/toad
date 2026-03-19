export type Project = {
  id: string
  name: string
  created_at: string
}

export type Column = {
  id: string
  project_id: string
  name: string
  position: number
  created_at: string
}

export type Issue = {
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

export type Settings = {
  id: number
  theme: string
  color_mode: "light" | "dark"
}

export type IssueInsert = Omit<
  Issue,
  | "id"
  | "created_at"
  | "updated_at"
  | "description"
  | "priority"
  | "labels"
  | "due_date"
  | "completed"
> & {
  id?: string
  description?: string
  priority?: "low" | "medium" | "high"
  labels?: string[]
  due_date?: string | null
  completed?: boolean
  created_at?: string
  updated_at?: string
}

export type IssueUpdate = Partial<
  Omit<Issue, "id" | "project_id" | "created_at" | "updated_at">
>
