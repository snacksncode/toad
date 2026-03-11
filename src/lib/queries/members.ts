import { supabase } from "@/lib/supabase"
import type { ProjectMember } from "@/lib/database.types"

export async function getProjectMembers(
  projectId: string
): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from("project_members")
    .select("id, project_id, user_id, invited_email, role, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function addMember(
  projectId: string,
  email: string
): Promise<ProjectMember> {
  const { data, error } = await supabase
    .from("project_members")
    .insert({
      project_id: projectId,
      invited_email: email,
      role: "member",
    })
    .select("id, project_id, user_id, invited_email, role, created_at")
    .single()

  if (error) throw error
  return data
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", memberId)

  if (error) throw error
}
