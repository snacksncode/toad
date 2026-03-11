import { createFileRoute, redirect, Link } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"
import { AppHeader } from "@/components/layout/header"
import { themes, type Theme } from "@/lib/themes"
import { useTheme } from "@/components/theme-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, ArrowLeft, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: "/login" })
    }
  },
  component: SettingsPage,
})

function ThemeCard({
  theme,
  isActive,
  colorMode,
  onSelect,
}: {
  theme: Theme
  isActive: boolean
  colorMode: "light" | "dark"
  onSelect: () => void
}) {
  const vars = colorMode === "dark" ? theme.cssVars.dark : theme.cssVars.light

  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        "cursor-pointer transition-shadow select-none",
        isActive
          ? "ring-2 ring-primary"
          : "hover:ring-2 hover:ring-foreground/20"
      )}
    >
      {/* Mini UI preview */}
      <div className="px-3">
        <div
          className="aspect-[5/3] rounded-lg overflow-hidden p-2.5 flex flex-col gap-1.5 ring-1 ring-inset ring-black/5 dark:ring-white/5"
          style={{ background: vars.background }}
        >
          <div
            className="h-2 w-3/4 rounded-full shrink-0"
            style={{ background: vars.primary }}
          />
          <div className="flex gap-1.5 flex-1 min-h-0">
            <div
              className="flex-1 rounded"
              style={{ background: vars.secondary }}
            />
            <div
              className="w-2/5 rounded"
              style={{ background: vars.accent }}
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div
              className="h-1.5 w-6 rounded-full"
              style={{ background: vars["muted-foreground"] }}
            />
            <div
              className="size-1.5 rounded-full ml-auto"
              style={{ background: vars.destructive }}
            />
          </div>
        </div>
      </div>

      {/* Name + swatches + active indicator */}
      <CardContent className="flex items-center gap-2 pt-0">
        <span className="text-sm font-medium">{theme.name}</span>
        <div className="flex gap-1 ml-auto">
          {[vars.background, vars.primary, vars.accent, vars.destructive].map(
            (color, i) => (
              <div
                key={i}
                className="size-3 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10"
                style={{ background: color }}
              />
            )
          )}
        </div>
        {isActive && (
          <Check className="size-4 text-primary shrink-0" strokeWidth={2.5} />
        )}
      </CardContent>
    </Card>
  )
}

function SettingsPage() {
  const {
    theme: activeTheme,
    setTheme,
    colorMode,
    toggleColorMode,
  } = useTheme()

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="size-3.5" />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-1">Appearance</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Customize how Toad looks and feels.
        </p>

        {/* Color mode section */}
        <section className="mb-10">
          <h2 className="text-base font-semibold mb-3">Color Mode</h2>
          <div className="flex gap-2">
            <Button
              variant={colorMode === "light" ? "default" : "outline"}
              size="sm"
              onClick={colorMode === "dark" ? toggleColorMode : undefined}
              className="gap-1.5"
            >
              <Sun className="size-3.5" />
              Light
            </Button>
            <Button
              variant={colorMode === "dark" ? "default" : "outline"}
              size="sm"
              onClick={colorMode === "light" ? toggleColorMode : undefined}
              className="gap-1.5"
            >
              <Moon className="size-3.5" />
              Dark
            </Button>
          </div>
        </section>

        {/* Theme gallery */}
        <section>
          <h2 className="text-base font-semibold mb-1">Theme</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Pick a color palette for your workspace.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {themes.map((t) => (
              <ThemeCard
                key={t.id}
                theme={t}
                isActive={t.id === activeTheme}
                colorMode={colorMode}
                onSelect={() => setTheme(t.id)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
