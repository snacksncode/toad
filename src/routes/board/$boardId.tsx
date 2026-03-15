import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"
import { AppSidebar } from "@/components/layout/sidebar"
import { AppHeader } from "@/components/layout/header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Column } from "@/components/board/column"
import { AddColumnButton } from "@/components/board/add-column-button"
import { BoardSettings } from "@/components/board/board-settings"
import { IssuePanel } from "@/components/board/issue-panel"

import { FilterBar } from "@/components/board/filter-bar"
import type { FilterState } from "@/components/board/filter-bar"
import { getProjectMembers } from "@/lib/queries/members"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getProjectColumns,
  createColumn,
  updateColumn,
  reorderColumns,
  deleteColumn,
} from "@/lib/queries/columns"
import {
  getProjectIssues,
  moveIssue,
  reorderIssues,
} from "@/lib/queries/issues"
import { updateProject, deleteProject } from "@/lib/queries/projects"
import type { Column as ColumnType, Issue } from "@/lib/database.types"
import { toast } from "sonner"
import { Loader2, Columns3, Settings } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { DragDropProvider, DragOverlay } from "@dnd-kit/react"
import {
  PointerSensor,
  PointerActivationConstraints,
  KeyboardSensor,
  Accessibility,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/dom"
import { move } from "@dnd-kit/helpers"
import { IssueCardOverlay } from "@/components/board/issue-card"

export const Route = createFileRoute("/board/$boardId")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: "/login" })
    }
  },
  component: BoardPage,
})

const EMPTY_COLUMNS: ColumnType[] = []
const EMPTY_ISSUES: Issue[] = []
const EMPTY_MEMBERS: Awaited<ReturnType<typeof getProjectMembers>> = []

function BoardPage() {
  const { boardId } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    assigneeEmail: null,
    priority: null,
    label: null,
  })

  // DnD drag-active flag — disables CSS snap during drag to prevent conflict
  const [isDragging, setIsDragging] = useState(false)

  // --- React Query: data fetching ---
  const { data: boardName = "" } = useQuery({
    queryKey: ["boards", boardId, "name"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("name")
        .eq("id", boardId)
        .single()
      return data?.name ?? ""
    },
  })

  const { data: columns = EMPTY_COLUMNS, isLoading: columnsLoading } = useQuery(
    {
      queryKey: ["boards", boardId, "columns"],
      queryFn: () => getProjectColumns(boardId),
    }
  )

  const { data: issues = EMPTY_ISSUES, isLoading: issuesLoading } = useQuery({
    queryKey: ["boards", boardId, "issues"],
    queryFn: () => getProjectIssues(boardId),
  })

  const { data: members = EMPTY_MEMBERS } = useQuery({
    queryKey: ["boards", boardId, "members"],
    queryFn: () => getProjectMembers(boardId),
  })

  const loading = columnsLoading || issuesLoading

  // Local columns state for DnD column reorder
  const [localColumns, setLocalColumns] = useState<ColumnType[]>(columns)

  // DnD state: columnId → issueId[] for visual ordering during drag
  const [items, setItems] = useState<Record<string, string[]>>({})
  const itemsRef = useRef<Record<string, string[]>>({})
  const itemsSnapshotRef = useRef<Record<string, string[]>>({})
  const columnsSnapshotRef = useRef<ColumnType[]>([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isDragging) return
    setLocalColumns(columns)
  }, [columns])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isDragging) return
    const map: Record<string, string[]> = {}
    for (const col of localColumns) {
      map[col.id] = issues
        .filter((i) => i.column_id === col.id)
        .sort((a, b) => a.position - b.position)
        .map((i) => i.id)
    }
    setItems(map)
  }, [issues, localColumns])

  // --- Mutation handlers ---

  const handleCreateColumn = useCallback(
    async (name: string) => {
      try {
        await createColumn(boardId, name)
        queryClient.invalidateQueries({
          queryKey: ["boards", boardId, "columns"],
        })
      } catch {
        toast.error("Failed to create column")
      }
    },
    [boardId, queryClient]
  )

  const handleRenameColumn = useCallback(
    async (columnId: string, name: string) => {
      try {
        await updateColumn(columnId, { name })
        queryClient.invalidateQueries({
          queryKey: ["boards", boardId, "columns"],
        })
      } catch {
        toast.error("Failed to rename column")
      }
    },
    [boardId, queryClient]
  )

  const handleDeleteColumn = useCallback(
    async (columnId: string) => {
      try {
        await deleteColumn(columnId)
        queryClient.invalidateQueries({
          queryKey: ["boards", boardId, "columns"],
        })
      } catch (err: unknown) {
        const pgError = err as { code?: string }
        if (pgError.code === "23503") {
          toast.error(
            "Cannot delete column with issues. Move or delete issues first."
          )
        } else {
          toast.error("Failed to delete column")
        }
      }
    },
    [boardId, queryClient]
  )

  const handleMoveColumn = useCallback(
    async (columnId: string, direction: "left" | "right") => {
      const idx = localColumns.findIndex((c) => c.id === columnId)
      if (idx === -1) return

      const swapIdx = direction === "left" ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= localColumns.length) return

      const newOrder = [...localColumns]
      const temp = newOrder[idx]
      newOrder[idx] = newOrder[swapIdx]
      newOrder[swapIdx] = temp

      // Optimistic update
      setLocalColumns(newOrder)

      try {
        await reorderColumns(
          boardId,
          newOrder.map((c) => c.id)
        )
        queryClient.invalidateQueries({
          queryKey: ["boards", boardId, "columns"],
        })
      } catch {
        queryClient.invalidateQueries({
          queryKey: ["boards", boardId, "columns"],
        })
        toast.error("Failed to reorder columns")
      }
    },
    [localColumns, boardId, queryClient]
  )

  // --- Computed values ---

  const filteredIssues = useMemo(
    () =>
      issues.filter((issue) => {
        if (
          filters.search &&
          !issue.title.toLowerCase().includes(filters.search.toLowerCase())
        )
          return false
        if (
          filters.assigneeEmail &&
          issue.assignee_email !== filters.assigneeEmail
        )
          return false
        if (filters.priority && issue.priority !== filters.priority)
          return false
        if (filters.label && !issue.labels.includes(filters.label)) return false
        return true
      }),
    [issues, filters]
  )

  // Issue lookup map for DnD rendering
  const issueMap = useMemo(() => {
    const map = new Map<string, Issue>()
    for (const issue of issues) {
      map.set(issue.id, issue)
    }
    return map
  }, [issues])

  // Filtered issue IDs for efficient lookup
  const filteredIssueIds = useMemo(
    () => new Set(filteredIssues.map((i) => i.id)),
    [filteredIssues]
  )

  // Get ordered + filtered issues for a column (driven by items state)
  const getColumnIssues = useCallback(
    (columnId: string): Issue[] => {
      const ids = items[columnId] ?? []
      return ids
        .filter((id) => filteredIssueIds.has(id))
        .map((id) => issueMap.get(id))
        .filter((issue): issue is Issue => issue !== undefined)
    },
    [items, filteredIssueIds, issueMap]
  )

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeBoardId={boardId} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader showSidebarTrigger />
          <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-4">
            <Columns3 className="size-5 text-muted-foreground" />
            <h1 className="truncate text-lg font-semibold sm:text-xl">
              {boardName || "Loading…"}
            </h1>
            <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
              {localColumns.length}{" "}
              {localColumns.length === 1 ? "column" : "columns"}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSettingsOpen(true)}
              title="Board settings"
              aria-label="Board settings"
              className="ml-auto"
            >
              <Settings className="size-4" />
            </Button>
          </div>
          {!loading && (
            <FilterBar
              issues={issues}
              members={members}
              filters={filters}
              onFiltersChange={setFilters}
              totalCount={issues.length}
              filteredCount={filteredIssues.length}
            />
          )}
          <main className="flex flex-1 flex-col overflow-hidden">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DragDropProvider
                sensors={[
                  PointerSensor.configure({
                    activationConstraints: (event) => {
                      if (event.pointerType === "touch") {
                        return [
                          new PointerActivationConstraints.Delay({
                            value: 200,
                            tolerance: 5,
                          }),
                        ]
                      }
                      return [
                        new PointerActivationConstraints.Distance({ value: 5 }),
                      ]
                    },
                  }),
                  KeyboardSensor,
                ]}
                plugins={(defaults) => [
                  ...defaults,
                  Accessibility.configure({
                    announcements: {
                      dragstart(event: Parameters<DragStartEvent>[0]) {
                        const source = event.operation.source
                        if (!source) return
                        if (source.type === "column") return `Picked up column`
                        const issue = issueMap.get(String(source.id))
                        return issue
                          ? `Picked up "${issue.title}"`
                          : `Picked up card`
                      },
                      dragover(event: Parameters<DragOverEvent>[0]) {
                        const { source, target } = event.operation
                        if (!source || !target) return
                        if (source.type === "column") return undefined
                        const issue = issueMap.get(String(source.id))
                        const colName = localColumns.find(
                          (c) => c.id === String(target.id)
                        )?.name
                        if (issue && colName)
                          return `"${issue.title}" over column "${colName}"`
                        return undefined
                      },
                      dragend(event: Parameters<DragEndEvent>[0]) {
                        const source = event.operation.source
                        if (!source) return
                        if (event.canceled) return `Drag cancelled`
                        if (source.type === "column") return `Column reordered`
                        const issue = issueMap.get(String(source.id))
                        return issue
                          ? `Dropped "${issue.title}"`
                          : `Card dropped`
                      },
                    },
                  }),
                ]}
                onDragStart={() => {
                  setIsDragging(true)
                  queryClient.cancelQueries({
                    queryKey: ["boards", boardId, "issues"],
                  })
                  itemsSnapshotRef.current = structuredClone(items)
                  columnsSnapshotRef.current = [...localColumns]
                }}
                onDragOver={(event) => {
                  const { source } = event.operation
                  if (source?.type === "column") return
                  setItems((currentItems) => {
                    const next = move(currentItems, event)
                    itemsRef.current = next
                    return next
                  })
                }}
                onDragEnd={async (event) => {
                  const { source } = event.operation
                  if (!source) {
                    setIsDragging(false)
                    return
                  }

                  if (event.canceled) {
                    if (source.type === "item")
                      setItems(itemsSnapshotRef.current)
                    if (source.type === "column")
                      setLocalColumns(columnsSnapshotRef.current)
                    setIsDragging(false)
                    return
                  }

                  if (source.type === "column") {
                    const target = event.operation.target
                    if (target && target.type === "column") {
                      const sourceIdx = localColumns.findIndex(
                        (c) => c.id === String(source.id)
                      )
                      const targetIdx = localColumns.findIndex(
                        (c) => c.id === String(target.id)
                      )
                      if (
                        sourceIdx !== -1 &&
                        targetIdx !== -1 &&
                        sourceIdx !== targetIdx
                      ) {
                        const newColumns = [...localColumns]
                        const [moved] = newColumns.splice(sourceIdx, 1)
                        newColumns.splice(targetIdx, 0, moved)
                        setLocalColumns(newColumns)
                        try {
                          await reorderColumns(
                            boardId,
                            newColumns.map((c) => c.id)
                          )
                        } catch {
                          queryClient.invalidateQueries({
                            queryKey: ["boards", boardId, "columns"],
                          })
                          toast.error("Failed to reorder columns")
                        }
                      }
                    }
                    setIsDragging(false)
                    return
                  }

                  const issueId = String(source.id)
                  const currentItems = itemsRef.current

                  let newGroupKey: string | null = null
                  let newPosition = 0
                  for (const [key, ids] of Object.entries(currentItems)) {
                    const idx = ids.indexOf(issueId)
                    if (idx !== -1) {
                      newGroupKey = key
                      newPosition = idx
                      break
                    }
                  }

                  if (!newGroupKey || !issueMap.get(issueId)) {
                    setIsDragging(false)
                    return
                  }

                  const issue = issueMap.get(issueId)!
                  const originalGroupKey = issue.column_id
                  const newColumnId = newGroupKey

                  try {
                    if (originalGroupKey !== newGroupKey) {
                      await moveIssue(issueId, newColumnId, newPosition)
                      const targetIds = currentItems[newGroupKey] ?? []
                      if (targetIds.length > 0)
                        await reorderIssues(newGroupKey, targetIds)
                      const origIds = currentItems[originalGroupKey] ?? []
                      if (origIds.length > 0)
                        await reorderIssues(originalGroupKey, origIds)
                    } else {
                      const ids = currentItems[newGroupKey] ?? []
                      await reorderIssues(newGroupKey, ids)
                    }
                    queryClient.setQueryData(
                      ["boards", boardId, "issues"],
                      (old: Issue[] | undefined) => {
                        if (!old) return old
                        return old.map((iss) => {
                          for (const [key, ids] of Object.entries(
                            currentItems
                          )) {
                            const idx = ids.indexOf(iss.id)
                            if (idx !== -1) {
                              return { ...iss, column_id: key, position: idx }
                            }
                          }
                          return iss
                        })
                      }
                    )
                    queryClient.invalidateQueries({
                      queryKey: ["boards", boardId, "issues"],
                    })
                  } catch {
                    setItems(itemsSnapshotRef.current)
                    toast.error("Failed to move issue")
                  }
                  setIsDragging(false)
                }}
              >
                <div
                  className={cn(
                    "flex-1 overflow-x-auto overflow-y-hidden",
                    !isDragging && "snap-x snap-mandatory md:snap-none"
                  )}
                >
                  <div className="flex h-full items-start gap-3 px-4 py-3 md:gap-5 md:px-6 md:py-6">
                    {localColumns.map((col, idx) => (
                      <Column
                        key={col.id}
                        column={col}
                        index={idx}
                        issues={getColumnIssues(col.id)}
                        isFirst={idx === 0}
                        isLast={idx === localColumns.length - 1}
                        onRename={(name) => handleRenameColumn(col.id, name)}
                        onDelete={() => handleDeleteColumn(col.id)}
                        onMoveLeft={() => handleMoveColumn(col.id, "left")}
                        onMoveRight={() => handleMoveColumn(col.id, "right")}
                        onIssueClick={(issue) => setSelectedIssue(issue)}
                      />
                    ))}
                    <AddColumnButton onAdd={handleCreateColumn} />
                  </div>
                </div>
                <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
                  {(source) => {
                    if (source.type === "column") {
                      const col = localColumns.find(
                        (c) => c.id === String(source.id)
                      )
                      if (!col) return null
                      const colIssues = getColumnIssues(col.id)
                      return (
                        <div className="w-80 rounded-xl border border-border/50 bg-muted/80 shadow-xl backdrop-blur-sm">
                          <div className="flex items-center gap-2 border-b border-border/30 px-3.5 py-3">
                            <span className="truncate text-sm font-semibold">
                              {col.name}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {colIssues.length}
                            </span>
                          </div>
                          <div className="max-h-[200px] overflow-hidden px-2.5 py-2.5">
                            {colIssues.slice(0, 3).map((issue) => (
                              <div
                                key={issue.id}
                                className="mb-2 truncate rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm opacity-70"
                              >
                                {issue.title}
                              </div>
                            ))}
                            {colIssues.length > 3 && (
                              <p className="text-center text-xs text-muted-foreground">
                                +{colIssues.length - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    }
                    const issue = issueMap.get(String(source.id))
                    if (!issue) return null
                    return <IssueCardOverlay issue={issue} />
                  }}
                </DragOverlay>
              </DragDropProvider>
            )}
          </main>
        </div>
        {user && (
          <BoardSettings
            projectId={boardId}
            projectName={boardName}
            currentUserId={user.id}
            onRename={async (newName) => {
              await updateProject(boardId, newName)
              queryClient.invalidateQueries({
                queryKey: ["boards", boardId, "name"],
              })
              setSettingsOpen(false)
            }}
            onDelete={async () => {
              await deleteProject(boardId)
              navigate({ to: "/dashboard" })
            }}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
          />
        )}
        <IssuePanel
          issue={selectedIssue}
          projectId={boardId}
          columns={localColumns}
          open={selectedIssue !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedIssue(null)
          }}
          onIssueUpdated={() => {
            queryClient.invalidateQueries({
              queryKey: ["boards", boardId, "issues"],
            })
          }}
          onIssueDeleted={() => {
            queryClient.invalidateQueries({
              queryKey: ["boards", boardId, "issues"],
            })
            setSelectedIssue(null)
          }}
        />
      </div>
    </SidebarProvider>
  )
}
