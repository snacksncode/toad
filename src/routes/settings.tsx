import { createFileRoute } from "@tanstack/react-router"
import { AppHeader } from "@/components/layout/header"
import { themes, type Theme } from "@/lib/themes"
import { useTheme } from "@/components/theme-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, ArrowLeft, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/settings")({
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
          className="flex aspect-[5/3] flex-col gap-1.5 overflow-hidden rounded-lg p-2.5 ring-1 ring-black/5 ring-inset dark:ring-white/5"
          style={{ background: vars.background }}
        >
          <div
            className="h-2 w-3/4 shrink-0 rounded-full"
            style={{ background: vars.primary }}
          />
          <div className="flex min-h-0 flex-1 gap-1.5">
            <div
              className="flex-1 rounded"
              style={{ background: vars.secondary }}
            />
            <div
              className="w-2/5 rounded"
              style={{ background: vars.accent }}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <div
              className="h-1.5 w-6 rounded-full"
              style={{ background: vars["muted-foreground"] }}
            />
            <div
              className="ml-auto size-1.5 rounded-full"
              style={{ background: vars.destructive }}
            />
          </div>
        </div>
      </div>

      {/* Name + swatches + active indicator */}
      <CardContent className="flex items-center gap-2 pt-0">
        <span className="text-sm font-medium">{theme.name}</span>
        <div className="ml-auto flex gap-1">
          {[vars.background, vars.primary, vars.accent, vars.destructive].map(
            (color, i) => (
              <div
                key={i}
                className="size-3 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/10"
                style={{ background: color }}
              />
            )
          )}
        </div>
        {isActive && (
          <Check className="size-4 shrink-0 text-primary" strokeWidth={2.5} />
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
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="container mx-auto max-w-5xl flex-1 px-4 py-6">
        <button
          onClick={() => window.history.back()}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </button>

        <h1 className="mb-1 text-2xl font-bold">Appearance</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Customize how Toad looks and feels.
        </p>

        {/* Color mode section */}
        <section className="mb-10">
          <h2 className="mb-3 text-base font-semibold">Color Mode</h2>
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
          <h2 className="mb-1 text-base font-semibold">Theme</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Pick a color palette for your workspace.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
