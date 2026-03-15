import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { Search, X, SlidersHorizontal } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Issue, ProjectMember } from "@/lib/database.types"

export interface FilterState {
  search: string
  assigneeEmail: string | null
  priority: "low" | "medium" | "high" | null
  label: string | null
}

interface FilterBarProps {
  issues: Issue[]
  members: ProjectMember[]
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  totalCount: number
  filteredCount: number
}

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const

const ALL = "__all__"

export function FilterBar({
  issues,
  members,
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)

  const uniqueEmails = useMemo(() => {
    const emails = new Set<string>()
    for (const m of members) {
      if (m.invited_email) emails.add(m.invited_email)
    }
    return Array.from(emails).sort()
  }, [members])

  const uniqueLabels = useMemo(() => {
    const labels = new Set<string>()
    for (const issue of issues) {
      for (const l of issue.labels) {
        labels.add(l)
      }
    }
    return Array.from(labels).sort()
  }, [issues])

  const hasActiveFilter =
    filters.search !== "" ||
    filters.assigneeEmail !== null ||
    filters.priority !== null ||
    filters.label !== null

  const activeFilterCount = [
    filters.search !== "",
    filters.assigneeEmail !== null,
    filters.priority !== null,
    filters.label !== null,
  ].filter(Boolean).length

  const clearAll = () =>
    onFiltersChange({
      search: "",
      assigneeEmail: null,
      priority: null,
      label: null,
    })

  if (isMobile) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <SlidersHorizontal className="size-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-medium text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>

          {hasActiveFilter && (
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {filteredCount} of {totalCount}
            </span>
          )}

          <SheetContent side="bottom" className="rounded-t-xl">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-3 px-4">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filters.search}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, search: e.target.value })
                  }
                  placeholder="Search issues…"
                  className="h-8 w-40 pl-7 text-xs sm:w-52"
                  aria-label="Search issues"
                />
              </div>

              <Select
                value={filters.assigneeEmail ?? ALL}
                onValueChange={(v) =>
                  onFiltersChange({
                    ...filters,
                    assigneeEmail: v === ALL ? null : v,
                  })
                }
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All assignees</SelectItem>
                  {uniqueEmails.map((email) => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.priority ?? ALL}
                onValueChange={(v) =>
                  onFiltersChange({
                    ...filters,
                    priority: v === ALL ? null : (v as FilterState["priority"]),
                  })
                }
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All priorities</SelectItem>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {uniqueLabels.length > 0 && (
                <Select
                  value={filters.label ?? ALL}
                  onValueChange={(v) =>
                    onFiltersChange({ ...filters, label: v === ALL ? null : v })
                  }
                >
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue placeholder="All labels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All labels</SelectItem>
                    {uniqueLabels.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {hasActiveFilter && (
              <SheetFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearAll()
                    setSheetOpen(false)
                  }}
                  className="w-full gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                  Clear all
                </Button>
              </SheetFooter>
            )}
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b px-4 py-2.5 sm:px-6">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          placeholder="Search issues…"
          className="h-8 w-40 pl-7 text-xs sm:w-52"
        />
      </div>

      <Select
        value={filters.assigneeEmail ?? ALL}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            assigneeEmail: v === ALL ? null : v,
          })
        }
      >
        <SelectTrigger size="sm" className="gap-1 text-xs">
          <SelectValue placeholder="All assignees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All assignees</SelectItem>
          {uniqueEmails.map((email) => (
            <SelectItem key={email} value={email}>
              {email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority ?? ALL}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            priority: v === ALL ? null : (v as FilterState["priority"]),
          })
        }
      >
        <SelectTrigger size="sm" className="gap-1 text-xs">
          <SelectValue placeholder="All priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priorities</SelectItem>
          {PRIORITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {uniqueLabels.length > 0 && (
        <Select
          value={filters.label ?? ALL}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, label: v === ALL ? null : v })
          }
        >
          <SelectTrigger size="sm" className="gap-1 text-xs">
            <SelectValue placeholder="All labels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All labels</SelectItem>
            {uniqueLabels.map((label) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilter && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
            Clear
          </Button>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {filteredCount} of {totalCount}
          </span>
        </>
      )}
    </div>
  )
}
