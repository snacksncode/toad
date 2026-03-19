import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { themes, type Theme } from "@/lib/themes"
import { db } from "@/lib/db"

const THEME_KEY = "toad-theme"
const COLOR_MODE_KEY = "toad-color-mode"

type ColorMode = "light" | "dark"

interface ThemeContextType {
  theme: string
  setTheme: (id: string) => void
  colorMode: ColorMode
  toggleColorMode: () => void
}

const FAVICON_THEMES = new Set(["sakura", "sunset", "nature", "vintage"])

function updateFavicon(themeId: string) {
  if (typeof document === "undefined") return
  const icon = FAVICON_THEMES.has(themeId) ? themeId : "sakura"
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement("link")
    link.rel = "icon"
    link.type = "image/svg+xml"
    document.head.appendChild(link)
  }
  link.href = `/icon-${icon}.svg`
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "sakura",
  setTheme: () => {},
  colorMode: "light",
  toggleColorMode: () => {},
})

function getStoredTheme(): string {
  if (typeof window === "undefined") return "sakura"
  return localStorage.getItem(THEME_KEY) ?? "sakura"
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

async function persistPreference(updates: {
  theme?: string
  color_mode?: "light" | "dark"
}) {
  try {
    const existing = await db.settings.get(1)
    if (existing) {
      await db.settings.update(1, updates)
    } else {
      await db.settings.add({
        id: 1,
        theme: updates.theme ?? "sakura",
        color_mode: updates.color_mode ?? "light",
      })
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
      updateFavicon(id)

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

      persistPreference({ color_mode: next })

      return next
    })
  }, [theme])

  useEffect(() => {
    db.settings.get(1).then((stored) => {
      if (!stored) return
      if (stored.color_mode && stored.color_mode !== getStoredColorMode()) {
        setColorMode(stored.color_mode)
        localStorage.setItem(COLOR_MODE_KEY, stored.color_mode)
        applyColorMode(stored.color_mode)
      }
      if (stored.theme && stored.theme !== getStoredTheme()) {
        const found = getThemeById(stored.theme)
        if (found) {
          setThemeState(stored.theme)
          localStorage.setItem(THEME_KEY, stored.theme)
          applyThemeVars(found, stored.color_mode ?? getStoredColorMode())
        }
      }
    })
  }, [])

  // Apply theme + color mode on initial mount only — subsequent changes
  // are applied imperatively by setTheme / toggleColorMode callbacks.
  useEffect(() => {
    const found = getThemeById(theme)
    if (found) applyThemeVars(found, colorMode)
    applyColorMode(colorMode)
    updateFavicon(theme)
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
