import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { themes, type Theme } from "@/lib/themes"
import { supabase } from "@/lib/supabase"

const THEME_KEY = "toad-theme"
const COLOR_MODE_KEY = "toad-color-mode"

type ColorMode = "light" | "dark"

interface ThemeContextType {
  theme: string
  setTheme: (id: string) => void
  colorMode: ColorMode
  toggleColorMode: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "default",
  setTheme: () => {},
  colorMode: "light",
  toggleColorMode: () => {},
})

function getStoredTheme(): string {
  if (typeof window === "undefined") return "default"
  return localStorage.getItem(THEME_KEY) ?? "default"
}

function getStoredColorMode(): ColorMode {
  if (typeof window === "undefined") return "light"
  const stored = localStorage.getItem(COLOR_MODE_KEY)
  if (stored === "light" || stored === "dark") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function getThemeById(id: string): Theme | undefined {
  return themes.find((t) => t.id === id)
}

// All CSS custom properties that themes can set.
// We clear these before applying a new theme so stale values
// (e.g. sidebar vars from Sakura) don't persist when switching
// to a theme that doesn't set them.
const THEME_PROPERTIES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "radius",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
]

function applyThemeVars(theme: Theme, colorMode: ColorMode) {
  const vars = colorMode === "dark" ? theme.cssVars.dark : theme.cssVars.light
  const root = document.documentElement

  // Clear all theme properties so CSS variable fallbacks work
  for (const prop of THEME_PROPERTIES) {
    root.style.removeProperty(`--${prop}`)
  }

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })
}

function applyColorMode(colorMode: ColorMode) {
  document.documentElement.classList.toggle("dark", colorMode === "dark")
}

/** Persist theme preference to DB (fire-and-forget). */
async function persistPreference(updates: {
  theme?: string
  color_mode?: string
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase.from("profiles").update(updates).eq("id", user.id)
    }
  } catch {
    // Silently fail — localStorage is the primary source
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<string>(getStoredTheme)
  const [colorMode, setColorMode] = useState<ColorMode>(getStoredColorMode)

  const setTheme = useCallback(
    (id: string) => {
      const found = getThemeById(id)
      if (!found) return

      setThemeState(id)
      localStorage.setItem(THEME_KEY, id)
      applyThemeVars(found, colorMode)

      // Persist to DB in background
      persistPreference({ theme: id })
    },
    [colorMode]
  )

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => {
      const next: ColorMode = prev === "light" ? "dark" : "light"
      localStorage.setItem(COLOR_MODE_KEY, next)
      applyColorMode(next)

      const found = getThemeById(theme)
      if (found) applyThemeVars(found, next)

      // Persist to DB in background
      persistPreference({ color_mode: next })

      return next
    })
  }, [theme])

  // Sync theme from DB when user signs in
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        session?.user
      ) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("theme, color_mode")
            .eq("id", session.user.id)
            .single()

          if (!data) return

          const dbTheme = data.theme as string | null
          const dbColorMode = data.color_mode as ColorMode | null

          // Sync color mode from DB if it differs from local
          if (
            dbColorMode &&
            (dbColorMode === "light" || dbColorMode === "dark")
          ) {
            const localMode = getStoredColorMode()
            if (dbColorMode !== localMode) {
              setColorMode(dbColorMode)
              localStorage.setItem(COLOR_MODE_KEY, dbColorMode)
              applyColorMode(dbColorMode)
            }
          }

          // Sync theme from DB if it differs from local
          if (dbTheme) {
            const localTheme = getStoredTheme()
            if (dbTheme !== localTheme) {
              const found = getThemeById(dbTheme)
              if (found) {
                setThemeState(dbTheme)
                localStorage.setItem(THEME_KEY, dbTheme)
                applyThemeVars(found, dbColorMode ?? getStoredColorMode())
              }
            }
          }
        } catch {
          // Columns might not exist yet — silently ignore
        }
      }
    })
    return () => subscription.unsubscribe()
    // Mount-only: subscribes to auth changes for DB→local theme sync.
    // State setters (setColorMode, setThemeState) are stable and don't need deps.
  }, [])

  // Apply theme + color mode on initial mount only — subsequent changes
  // are applied imperatively by setTheme / toggleColorMode callbacks.
  useEffect(() => {
    const found = getThemeById(theme)
    if (found) applyThemeVars(found, colorMode)
    applyColorMode(colorMode)
    // Mount-only: reads initial state to sync DOM. Callbacks handle updates after mount.
  }, [])

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, colorMode, toggleColorMode }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  return ctx
}
