import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { boardKeys } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"
import { AppSidebar } from "@/components/layout/sidebar"
import { AppHeader } from "@/components/layout/header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Column } from "@/components/board/column"
import { AddColumnButton } from "@/components/board/add-column-button"
import { BoardSettings } from "@/components/board/board-settings"
import { IssuePanel } from "@/components/board/issue-panel"
import { Backlog, BacklogCardOverlay } from "@/components/board/backlog"
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
import { getProjectIssues, moveIssue, reorderIssues, reorderBacklog } from "@/lib/queries/issues"
import { updateProject, deleteProject } from "@/lib/queries/projects"
import type { Column as ColumnType, Issue } from "@/lib/database.types"
import { toast } from "sonner"
import { Loader2, Columns3, Settings } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { DragDropProvider, DragOverlay } from "@dnd-kit/react"
import { PointerSensor, PointerActivationConstraints } from "@dnd-kit/dom"
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
    queryKey: boardKeys.detail(boardId),
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("name")
        .eq("id", boardId)
        .single()
      return data?.name ?? ""
    },
  })

  const { data: queryColumns = [] } = useQuery({
    queryKey: boardKeys.columns(boardId),
    queryFn: () => getProjectColumns(boardId),
  })

  const { data: issues = [], isLoading: issuesLoading } = useQuery({
    queryKey: boardKeys.issues(boardId),
    queryFn: () => getProjectIssues(boardId),
  })

  const { data: members = [] } = useQuery({
    queryKey: boardKeys.members(boardId),
    queryFn: () => getProjectMembers(boardId),
  })

  const loading = issuesLoading

  // --- DnD state ---

  // Local columns state for DnD column reorder (syncs from query when not dragging)
  const [columns, setColumns] = useState<ColumnType[]>([])

  // Sync columns from query when not dragging — with equality check to avoid loops
  const prevColumnsRef = useRef<ColumnType[]>([])
  useEffect(() => {
    if (isDragging) return
    // Only sync if data actually changed (shallow compare length + ids)
    const hasChanged =
      queryColumns.length !== prevColumnsRef.current.length ||
      queryColumns.some((c, i) => c.id !== prevColumnsRef.current[i]?.id)
    if (hasChanged) {
      prevColumnsRef.current = queryColumns
      setColumns(queryColumns)
    }
  }, [queryColumns, isDragging])


  // DnD state: columnId → issueId[] for visual ordering during drag
  const [items, setItems] = useState<Record<string, string[]>>({})
  const itemsSnapshotRef = useRef<Record<string, string[]>>({})
  const itemsRef = useRef<Record<string, string[]>>({})
  const columnsSnapshotRef = useRef<ColumnType[]>([])
  const columnsRef = useRef<ColumnType[]>([])

  // Track active dragged issue for DragOverlay
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null)

  // Keep itemsRef in sync for use in async handlers
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Keep columnsRef in sync for use in async handlers
  useEffect(() => {
    columnsRef.current = columns
  }, [columns])

  // Sync items from issues + columns (including backlog)
  useEffect(() => {
    const map: Record<string, string[]> = {}
    // Backlog: issues with no column
    map.backlog = issues
      .filter((i) => i.column_id === null)
      .sort((a, b) => a.position - b.position)
      .map((i) => i.id)
    // Columns
    for (const col of columns) {
      map[col.id] = issues
        .filter((i) => i.column_id === col.id)
        .sort((a, b) => a.position - b.position)
        .map((i) => i.id)
    }
    setItems(map)
  }, [issues, columns])

  // --- Mutation handlers ---

  const handleCreateColumn = useCallback(
    async (name: string) => {
      try {
        await createColumn(boardId, name)
        queryClient.invalidateQueries({ queryKey: boardKeys.columns(boardId) })
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
        queryClient.invalidateQueries({ queryKey: boardKeys.columns(boardId) })
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
        queryClient.invalidateQueries({ queryKey: boardKeys.columns(boardId) })
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
      const idx = columns.findIndex((c) => c.id === columnId)
      if (idx === -1) return

      const swapIdx = direction === "left" ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= columns.length) return

      const newOrder = [...columns]
      const temp = newOrder[idx]
      newOrder[idx] = newOrder[swapIdx]
      newOrder[swapIdx] = temp

      // Optimistic update
      setColumns(newOrder)

      try {
        await reorderColumns(
          boardId,
          newOrder.map((c) => c.id)
        )
        queryClient.invalidateQueries({ queryKey: boardKeys.columns(boardId) })
      } catch {
        // Revert on failure
        queryClient.invalidateQueries({ queryKey: boardKeys.columns(boardId) })
        toast.error("Failed to reorder columns")
      }
    },
    [columns, boardId, queryClient]
  )

  const handleIssueCreated = useCallback(
    async (_issue: Issue) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.issues(boardId) })
    },
    [boardId, queryClient]
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
        if (filters.label && !issue.labels.includes(filters.label))
          return false
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

  // Get ordered backlog issues (driven by items state)
  const backlogIssues = useMemo((): Issue[] => {
    const ids = items.backlog ?? []
    return ids
      .map((id) => issueMap.get(id))
      .filter((issue): issue is Issue => issue !== undefined)
  }, [items, issueMap])

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeBoardId={boardId} />
        <div className="flex flex-col flex-1 min-w-0">
          <AppHeader showSidebarTrigger />
          <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-4 border-b shrink-0">
            <Columns3 className="size-5 text-muted-foreground" />
            <h1 className="text-lg sm:text-xl font-semibold truncate">
              {boardName || "Loading…"}
            </h1>
            <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
              {columns.length} {columns.length === 1 ? "column" : "columns"}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSettingsOpen(true)}
              title="Board settings"
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
          <main className="flex-1 overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DragDropProvider
                sensors={[
                  PointerSensor.configure({
                    activationConstraints: (event) => {
                      if (event.pointerType === "touch") {
                        return [
                          new PointerActivationConstraints.Delay({ value: 200, tolerance: 5 }),
                        ]
                      }
                      // Mouse: small distance to prevent accidental drags on click
                      return [
                        new PointerActivationConstraints.Distance({ value: 5 }),
                      ]
                    },
                  }),
                ]}
                onDragStart={(event) => {
                  setIsDragging(true)

                  // Snapshot for cancel revert
                  const snapshot: Record<string, string[]> = {}
                  for (const [k, v] of Object.entries(items)) {
                    snapshot[k] = [...v]
                  }
                  itemsSnapshotRef.current = snapshot
                  columnsSnapshotRef.current = [...columns]

                  // Track dragged issue for DragOverlay
                  const source = event.operation.source
                  if (source?.type === "item") {
                    setActiveIssueId(String(source.id))
                  }
                }}
                onDragOver={(event) => {
                  const source = event.operation.source
                  if (!source) return

                  if (source.type === "column") {
                    const target = event.operation.target
                    if (!target || target.type !== "column" || source.id === target.id) return

                    setColumns((prev) => {
                      const sourceIdx = prev.findIndex((c) => c.id === String(source.id))
                      const targetIdx = prev.findIndex((c) => c.id === String(target.id))
                      if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) return prev
                      const next = [...prev]
                      const [moved] = next.splice(sourceIdx, 1)
                      next.splice(targetIdx, 0, moved)
                      return next
                    })
                  } else {
                    // Track position in ref only — don't trigger React re-render during drag.
                    // Re-rendering moves the card between Column components (unmount/remount),
                    // which causes the Feedback plugin to recalculate and the overlay to jump.
                    itemsRef.current = move(itemsRef.current, event)
                  }

                  // Prevent OptimisticSortingPlugin from also manipulating the DOM,
                  // which conflicts with React's state-driven rendering
                  if ("preventDefault" in event) event.preventDefault()
                }}
                onDragEnd={async (event) => {
                  // Always clear overlay
                  setActiveIssueId(null)
                  setIsDragging(false)

                  if (event.canceled) {
                    setColumns(columnsSnapshotRef.current)
                    setItems(itemsSnapshotRef.current)
                    return
                  }

                  // Apply tracked position to state immediately so the card
                  // appears in its new column before the async persist completes
                  setItems({ ...itemsRef.current })

                  const source = event.operation.source
                  if (!source) return


                  // Column drag — persist reorder
                  if (source.type === "column") {
                    const currentColumns = columnsRef.current
                    try {
                      await reorderColumns(boardId, currentColumns.map((c) => c.id))
                    } catch {
                      queryClient.invalidateQueries({ queryKey: boardKeys.columns(boardId) })
                      toast.error("Failed to reorder columns")
                    }
                    return
                  }

                  const issueId = String(source.id)
                  const currentItems = itemsRef.current

                  // Find which group (backlog or column) the issue landed in
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

                  if (!newGroupKey) return

                  const issue = issueMap.get(issueId)
                  if (!issue) return

                  // Original group: column_id or "backlog"
                  const originalGroupKey = issue.column_id ?? "backlog"
                  // New column_id: null if backlog, otherwise the column UUID
                  const newColumnId = newGroupKey === "backlog" ? null : newGroupKey

                  try {
                    if (originalGroupKey !== newGroupKey) {
                      // Cross-group move (column↔column, column↔backlog, backlog↔column)
                      await moveIssue(issueId, newColumnId, newPosition)

                      // Reorder target group
                      const targetIds = currentItems[newGroupKey] ?? []
                      if (targetIds.length > 0) {
                        if (newGroupKey === "backlog") {
                          await reorderBacklog(boardId, targetIds)
                        } else {
                          await reorderIssues(newGroupKey, targetIds)
                        }
                      }

                      // Reorder source group
                      const origIds = currentItems[originalGroupKey] ?? []
                      if (origIds.length > 0) {
                        if (originalGroupKey === "backlog") {
                          await reorderBacklog(boardId, origIds)
                        } else {
                          await reorderIssues(originalGroupKey, origIds)
                        }
                      }
                    } else {
                      // Same-group reorder
                      const ids = currentItems[newGroupKey] ?? []
                      if (newGroupKey === "backlog") {
                        await reorderBacklog(boardId, ids)
                      } else {
                        await reorderIssues(newGroupKey, ids)
                      }
                    }
                    // Refetch to sync with DB
                    queryClient.invalidateQueries({ queryKey: boardKeys.issues(boardId) })
                  } catch {
                    setItems(itemsSnapshotRef.current)
                    toast.error("Failed to move issue")
                  }
                }}
              >
                <Backlog
                  issues={backlogIssues}
                  projectId={boardId}
                  onIssueCreated={handleIssueCreated}
                  onIssueClick={(issue) => setSelectedIssue(issue)}
                />
                <div className={cn("flex-1 overflow-x-auto overflow-y-hidden", !isDragging && "snap-x snap-mandatory md:snap-none")}>
                  <div className="flex gap-3 md:gap-5 px-4 md:px-6 py-3 md:py-6 h-full items-start">
                    {columns.map((col, idx) => (
                      <Column
                        key={col.id}
                        column={col}
                        index={idx}
                        issues={getColumnIssues(col.id)}
                        isFirst={idx === 0}
                        isLast={idx === columns.length - 1}
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
                <DragOverlay>
                  {activeIssueId && issueMap.get(activeIssueId) ? (
                    issueMap.get(activeIssueId)!.column_id === null
                      ? <BacklogCardOverlay issue={issueMap.get(activeIssueId)!} />
                      : <IssueCardOverlay issue={issueMap.get(activeIssueId)!} />
                  ) : null}
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
              queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) })
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
          columns={columns}
          open={selectedIssue !== null}
          onOpenChange={(open) => { if (!open) setSelectedIssue(null) }}
          onIssueUpdated={() => {
            queryClient.invalidateQueries({ queryKey: boardKeys.issues(boardId) })
          }}
          onIssueDeleted={() => {
            queryClient.invalidateQueries({ queryKey: boardKeys.issues(boardId) })
            setSelectedIssue(null)
          }}
        />
      </div>
    </SidebarProvider>
  )
}
