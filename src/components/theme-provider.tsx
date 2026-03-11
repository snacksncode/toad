import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { themes, type Theme } from "@/lib/themes"

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

function applyThemeVars(theme: Theme, colorMode: ColorMode) {
  const vars = colorMode === "dark" ? theme.cssVars.dark : theme.cssVars.light
  const root = document.documentElement

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })
}

function applyColorMode(colorMode: ColorMode) {
  document.documentElement.classList.toggle("dark", colorMode === "dark")
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

      return next
    })
  }, [theme])

  // Apply on mount
  useEffect(() => {
    const found = getThemeById(theme)
    if (found) applyThemeVars(found, colorMode)
    applyColorMode(colorMode)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorMode, toggleColorMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  return ctx
}
