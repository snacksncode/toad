import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar } from "@/components/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/hooks/use-auth"
import { LogOut, Settings } from "lucide-react"

interface AppHeaderProps {
  showSidebarTrigger?: boolean
}

export function AppHeader({ showSidebarTrigger = false }: AppHeaderProps) {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate({ to: "/login" })
  }

  return (
    <header className="flex h-14 items-center gap-2 border-b px-4 shrink-0">
      {showSidebarTrigger && <SidebarTrigger />}
      <Link to="/dashboard" className="font-bold text-lg mr-auto">
        🐸 Toad
      </Link>
      <ThemeToggle />
      {!loading && user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar email={user.email ?? ""} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : !loading ? (
        <Button variant="ghost" size="sm" asChild>
          <Link to="/login">Sign in</Link>
        </Button>
      ) : null}
    </header>
  )
}
