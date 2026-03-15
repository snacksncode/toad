import { useState, useMemo } from "react"
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"
import { queryClient } from "@/lib/query-client"
import { boardQueries } from "@/lib/query-keys"
import { AppSidebar } from "@/components/layout/sidebar"
import { AppHeader } from "@/components/layout/header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Column } from "@/components/board/column"
import { AddColumnButton } from "@/components/board/add-column-button"
import { BoardSettings } from "@/components/board/board-settings"
import { IssuePanel } from "@/components/board/issue-panel"
import { FilterBar } from "@/components/board/filter-bar"
import type { FilterState } from "@/components/board/filter-bar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateProject, deleteProject } from "@/lib/queries/projects"
import type { Issue } from "@/lib/database.types"
import { Columns3, Settings } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useBoardDnd } from "@/hooks/use-board-dnd"
import { useBoardMutations } from "@/hooks/use-board-mutations"
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
import { IssueCardOverlay } from "@/components/board/issue-card"
import { MobileColumnSection } from "@/components/board/mobile-column-section"
import { useIsMobile } from "@/hooks/use-mobile"

export const Route = createFileRoute("/board/$boardId")({
  beforeLoad: async () => {
    const cachedUser = queryClient.getQueryData(["auth", "user"])
    if (cachedUser) return
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw redirect({ to: "/login" })
  },
  loader: ({ params: { boardId } }) =>
    Promise.all([
      queryClient.ensureQueryData(boardQueries.name(boardId)),
      queryClient.ensureQueryData(boardQueries.columns(boardId)),
      queryClient.ensureQueryData(boardQueries.issues(boardId)),
      queryClient.ensureQueryData(boardQueries.members(boardId)),
    ]),
  component: BoardPage,
})

function BoardPage() {
  const { boardId } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    assigneeEmail: null,
    priority: null,
    label: null,
  })

  const { data: boardName } = useSuspenseQuery(boardQueries.name(boardId))
  const { data: columns } = useSuspenseQuery(boardQueries.columns(boardId))
  const { data: issues } = useSuspenseQuery(boardQueries.issues(boardId))
  const { data: members } = useSuspenseQuery(boardQueries.members(boardId))

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

  const filteredIssueIds = useMemo(
    () => new Set(filteredIssues.map((i) => i.id)),
    [filteredIssues]
  )

  const {
    localColumns,
    setLocalColumns,
    isDragging,
    issueMap,
    getColumnIssues,
    dndProps,
  } = useBoardDnd({
    boardId,
    columns,
    issues,
    filteredIssueIds,
    queryClient: qc,
  })

  const {
    handleCreateColumn,
    handleRenameColumn,
    handleDeleteColumn,
    handleMoveColumn,
  } = useBoardMutations({
    boardId,
    queryClient: qc,
    localColumns,
    setLocalColumns,
  })

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeBoardId={boardId} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader showSidebarTrigger />
          <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-4">
            <Columns3 className="size-5 text-muted-foreground" />
            <h1 className="truncate text-lg font-semibold sm:text-xl">
              {boardName || "Loading\u2026"}
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
          <FilterBar
            issues={issues}
            members={members}
            filters={filters}
            onFiltersChange={setFilters}
            totalCount={issues.length}
            filteredCount={filteredIssues.length}
          />
          <main className="flex flex-1 flex-col overflow-hidden">
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
                      return issue ? `Dropped "${issue.title}"` : `Card dropped`
                    },
                  },
                }),
              ]}
              onDragStart={dndProps.onDragStart}
              onDragOver={dndProps.onDragOver}
              onDragEnd={dndProps.onDragEnd}
            >
              {isMobile ? (
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col py-2">
                    {localColumns.map((col, idx) => (
                      <MobileColumnSection
                        key={col.id}
                        column={col}
                        index={idx}
                        issues={getColumnIssues(col.id)}
                        boardId={boardId}
                        onIssueClick={(issue) => setSelectedIssue(issue)}
                      />
                    ))}
                    <div className="px-4 pb-4">
                      <AddColumnButton onAdd={handleCreateColumn} />
                    </div>
                  </div>
                </div>
              ) : (
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
                        projectId={boardId}
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
              )}
              <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
                {(source) => {
                  if (source.type === "column") {
                    return null
                  }
                  const issue = issueMap.get(String(source.id))
                  if (!issue) return null
                  return <IssueCardOverlay issue={issue} />
                }}
              </DragOverlay>
            </DragDropProvider>
          </main>
        </div>
        {user && (
          <BoardSettings
            projectId={boardId}
            projectName={boardName}
            currentUserId={user.id}
            members={members}
            onRename={async (newName) => {
              await updateProject(boardId, newName)
              qc.invalidateQueries({
                queryKey: boardQueries.name(boardId).queryKey,
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
          key={selectedIssue?.id}
          issue={selectedIssue}
          columns={localColumns}
          members={members}
          open={selectedIssue !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedIssue(null)
          }}
          onIssueUpdated={() => {
            qc.invalidateQueries({
              queryKey: boardQueries.issues(boardId).queryKey,
            })
          }}
          onIssueDeleted={() => {
            qc.invalidateQueries({
              queryKey: boardQueries.issues(boardId).queryKey,
            })
            setSelectedIssue(null)
          }}
        />
      </div>
    </SidebarProvider>
  )
}
