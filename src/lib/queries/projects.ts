import { supabase } from "@/lib/supabase"
import type { Project } from "@/lib/database.types"

export interface ProjectWithMemberCount extends Project {
  memberCount: number
}

export async function getUserProjects(
  userId: string
): Promise<ProjectWithMemberCount[]> {
  // 1. Get project IDs where user is a member
  const { data: memberships, error: memberError } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId)

  if (memberError) throw memberError
  if (!memberships || memberships.length === 0) return []

  const projectIds = memberships.map((m) => m.project_id)

  // 2. Parallelize fetching projects and member counts (independent queries)
  const [projectsResult, membersResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, owner_id, created_at")
      .in("id", projectIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_members")
      .select("project_id")
      .in("project_id", projectIds),
  ])

  const { data: projects, error: projectError } = projectsResult
  const { data: allMembers, error: countError } = membersResult

  if (projectError) throw projectError
  if (countError) throw countError
  if (!projects) return []

  const countMap = new Map<string, number>()
  for (const row of allMembers ?? []) {
    countMap.set(row.project_id, (countMap.get(row.project_id) ?? 0) + 1)
  }

  return projects.map((project) => ({
    ...project,
    memberCount: countMap.get(project.id) ?? 1,
  }))
}

export async function createProject(
  name: string,
  userId: string,
  userEmail: string
): Promise<Project> {
  // 1. Create the project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({ name, owner_id: userId })
    .select("id, name, owner_id, created_at")
    .single()

  if (projectError) throw projectError

  // 2. Add the creator as owner in project_members
  const { error: memberError } = await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: userId,
    invited_email: userEmail,
    role: "owner",
  })

  if (memberError) throw memberError

  // 3. Create 3 default columns
  const defaultColumns = [
    { project_id: project.id, name: "To Do", position: 0 },
    { project_id: project.id, name: "In Progress", position: 1 },
    { project_id: project.id, name: "Done", position: 2 },
  ]

  const { error: columnsError } = await supabase
    .from("columns")
    .insert(defaultColumns)

  if (columnsError) throw columnsError

  return project
}

export async function updateProject(
  projectId: string,
  name: string
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ name })
    .eq("id", projectId)

  if (error) throw error
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId)

  if (error) throw error
}
