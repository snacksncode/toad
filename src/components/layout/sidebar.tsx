import { useState, useEffect } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar"
import { Link } from "@tanstack/react-router"
import { LayoutDashboard, Kanban, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

interface BoardItem {
  id: string
  name: string
}

interface AppSidebarProps {
  activeBoardId?: string
}

export function AppSidebar({ activeBoardId }: AppSidebarProps) {
  const { user } = useAuth()
  const [boards, setBoards] = useState<BoardItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function fetchBoards() {
      setLoading(true)
      // Get project IDs the user is a member of
      const { data: memberships } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user!.id)

      if (memberships && memberships.length > 0) {
        const projectIds = memberships.map((m) => m.project_id)
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name")
          .in("id", projectIds)
          .order("name", { ascending: true })

        if (projects) {
          setBoards(projects)
        }
      } else {
        setBoards([])
      }
      setLoading(false)
    }

    fetchBoards()
  }, [user])

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link to="/dashboard" className="font-bold text-lg">
          🐸 Toad
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={!activeBoardId}>
              <Link to="/dashboard">
                <LayoutDashboard className="size-4" />
                <span>All Boards</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarGroup>
          <SidebarGroupLabel>Your Boards</SidebarGroupLabel>
          <SidebarMenu>
            {loading ? (
              <>
                <SidebarMenuSkeleton />
                <SidebarMenuSkeleton />
                <SidebarMenuSkeleton />
              </>
            ) : boards.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No boards yet
              </div>
            ) : (
              boards.map((board) => (
                <SidebarMenuItem key={board.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeBoardId === board.id}
                  >
                    <Link
                      to="/board/$boardId"
                      params={{ boardId: board.id }}
                    >
                      <Kanban className="size-4" />
                      <span className="truncate">{board.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link
                  to="/dashboard"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-4" />
                  <span>New Board</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
