import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Link, useMatchRoute } from "@tanstack/react-router"
import { Palette } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

const FAVICON_THEMES = new Set(["sakura", "sunset", "nature", "vintage"])

function getIconPath(themeId: string) {
  const icon = FAVICON_THEMES.has(themeId) ? themeId : "sakura"
  return `/icon-${icon}.svg`
}

interface AppHeaderProps {
  showSidebarTrigger?: boolean
}

export function AppHeader({ showSidebarTrigger = false }: AppHeaderProps) {
  const { theme } = useTheme()
  const matchRoute = useMatchRoute()
  const isSettings = matchRoute({ to: "/settings" })

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      {showSidebarTrigger && <SidebarTrigger />}
      <Link
        to="/dashboard"
        className="mr-auto flex items-center gap-2 text-lg font-bold"
      >
        <img src={getIconPath(theme)} alt="" className="size-6 rounded" />
        Toad
      </Link>
      {!isSettings && (
        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
          <Link to="/settings">
            <Palette className="size-4" />
            Appearance
          </Link>
        </Button>
      )}
    </header>
  )
}
