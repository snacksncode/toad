import { useQuery } from "@tanstack/react-query"
import { useTheme } from "@/components/theme-provider"
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
import { projectQueries } from "@/lib/query-keys"

interface AppSidebarProps {
  activeBoardId?: string
}

const FAVICON_THEMES = new Set(["sakura", "sunset", "nature", "vintage"])

export function AppSidebar({ activeBoardId }: AppSidebarProps) {
  const { theme } = useTheme()
  const iconPath = FAVICON_THEMES.has(theme)
    ? `/icon-${theme}.svg`
    : "/icon-sakura.svg"
  const { data: boards = [], isLoading: loading } = useQuery({
    ...projectQueries.list(),
    select: (data) =>
      data
        .map(({ id, name }) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
  })

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-lg font-bold"
        >
          <img src={iconPath} alt="" className="size-5 rounded" />
          Toad
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
                    <Link to="/board/$boardId" params={{ boardId: board.id }}>
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
