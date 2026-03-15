# Toad: Cleanup → Mobile List View → Final Polish

## TL;DR

> **Quick Summary**: Three-phase overhaul — clean up vibecoded React anti-patterns (dead code, useEffect abuse, god component), implement responsive mobile list view (stacked sections vs horizontal columns), then final polish pass.
>
> **Deliverables**:
>
> - Clean, production-ready React codebase following Vercel best practices
> - Mobile: stacked list layout with section headers instead of horizontal columns
> - Desktop: columns with inline "+" add-issue buttons
> - DragOverlay removed for columns (cards only)
> - $boardId.tsx god component broken into focused hooks
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Dead code → Data fetch fix → Extract hooks → Mobile layout → Final QA

---

## Context

### Original Request

User wants the codebase cleaned up following React best practices (Vercel AGENTS.md, "You Might Not Need an Effect"), then mobile redesigned from horizontal columns to stacked list view, then a final cleanup pass. Column DragOverlay should be removed (only cards get overlays). Desktop columns need "+" buttons to add issues.

### Research Findings (4 agents)

**Metis found**: 13 useEffect issues, 8 dead code items, 5 state management problems, 5 type safety issues, 3 component structure problems.

**Momus found**: 6 CRITICAL issues (god component, data-fetching effects, sidebar manual fetch), 4 HIGH issues (dead files, auth per-component subscriptions, prop-sync anti-pattern), 6 MEDIUM issues (duplicate card markup, accessibility gaps).

**Librarian found**: 11 useEffect anti-patterns from React docs, mobile Kanban industry pattern (stacked accordion sections), DnD responsive strategy (switch sortable orientation per viewport).

**Explore found**: Promise.all() optimization in projects.ts, all other Vercel rules passing. No barrel import violations. No nested component definitions.

---

## Work Objectives

### Core Objective

Transform a vibecoded Kanban board app into production-quality code with responsive mobile layout.

### Concrete Deliverables

- Zero dead code files/exports
- Zero unnecessary useEffects
- Zero eslint-disable comments in user code
- $boardId.tsx under 300 lines (from 617)
- Single auth subscription (from 4)
- Mobile: stacked list layout with section headers
- Desktop: column "+" buttons for inline issue creation
- Column DragOverlay removed

### Must Have

- TypeScript strict compliance (tsc --noEmit passes)
- Build passes (vite build)
- DnD works on both desktop and mobile after changes
- No regression in existing functionality

### Must NOT Have (Guardrails)

- No new npm dependencies
- No changes to routeTree.gen.ts (auto-generated)
- No changes to src/components/ui/\* (shadcn managed)
- No new features beyond what's specified
- No "while I was here" scope creep

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision

- **Infrastructure exists**: NO (0 test files)
- **Automated tests**: None (no test framework set up)
- **Framework**: N/A

### QA Policy

Every task MUST run `tsc --noEmit && vite build` as acceptance criteria.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

---

## Execution Strategy

### Parallel Execution Waves

```
PHASE 1: CLEANUP

Wave 1 (Start immediately — no dependencies):
├── Task 1: Delete dead code files & exports [quick]
├── Task 2: Fix backlog column_id type artifacts [quick]
├── Task 3: Convert useAuth to shared AuthProvider context [quick]
├── Task 4: Deduplicate IssueCard/IssueCardOverlay via shared content [quick]
└── Task 5: Accessibility fixes (ARIA labels) [quick]

Wave 2 (After Wave 1):
├── Task 6: Replace data-fetching useEffects with React Query/props [unspecified-high]
└── Task 7: Tighten type safety (env validation, error narrowing) [quick]

Wave 3 (After Wave 2):
├── Task 8: Fix remaining useEffects (autoFocus, key prop, DnD deps) [unspecified-high]
└── Task 9: Extract $boardId.tsx into custom hooks [deep]

PHASE 2: MOBILE LIST VIEW + DESKTOP IMPROVEMENTS

Wave 4 (After Wave 3):
├── Task 10: Remove column DragOverlay (cards only) [quick]
├── Task 11: Mobile stacked list layout (sections instead of columns) [visual-engineering]
└── Task 12: Desktop column "+" inline add-issue buttons [visual-engineering]

PHASE 3: FINAL POLISH

Wave 5 (After Wave 4):
└── Task 13: Final verification — typecheck, build, smoke test [unspecified-low]

Critical Path: Task 1 → Task 6 → Task 8 → Task 9 → Task 11 → Task 13
Max Concurrent: 5 (Wave 1)
```

### Agent Dispatch Summary

- **Wave 1**: 5 tasks → T1 `quick`, T2 `quick`, T3 `quick`, T4 `quick`, T5 `quick`
- **Wave 2**: 2 tasks → T6 `unspecified-high`, T7 `quick`
- **Wave 3**: 2 tasks → T8 `unspecified-high`, T9 `deep`
- **Wave 4**: 3 tasks → T10 `quick`, T11 `visual-engineering`, T12 `visual-engineering`
- **Wave 5**: 1 task → T13 `unspecified-low`

---

## TODOs

### PHASE 1: CLEANUP

- [x] 1. Delete dead code files & exports

  **What to do**:
  - Delete `src/lib/auth.ts` (never imported — confirmed by all 4 agents)
  - Delete `src/components/board/create-issue-dialog.tsx` (never imported — 243 lines of dead code)
  - Remove `getColumnIssues` export from `src/lib/queries/issues.ts` (lines 7-16, never imported)
  - Remove `ProjectInsert` and `ColumnInsert` type exports from `src/lib/database.types.ts` (never imported)
  - Remove `"use client"` directives from `src/components/ui/date-picker.tsx`, `calendar.tsx`, `tooltip.tsx`, `sidebar.tsx` (Vite app, not Next.js)
  - Clean `use-auth.ts`: remove `handleSignIn` (never used), `handleSignUp` (never used), `session` state (never consumed by any caller)
  - Remove `next-themes` from package.json dependencies (app uses custom ThemeProvider)
  - Verify `web-vitals` is used; remove if not

  **Must NOT do**: Delete `query-keys.ts` (will be adopted in Task 6 instead)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`react-doctor`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: None

  **References**:
  - `src/lib/auth.ts` — entire file is dead code, `use-auth.ts` reimplements everything
  - `src/lib/queries/issues.ts:7-16` — `getColumnIssues` function, board page has its own local version
  - `src/hooks/use-auth.ts:29-41` — `handleSignIn`/`handleSignUp` never destructured by consumers

  **Acceptance Criteria**:

  ```
  Scenario: Dead code removed
    Tool: Bash
    Steps:
      1. Run: tsc --noEmit
      2. Run: vite build
      3. Run: grep -rn "from \"@/lib/auth\"" src/
      4. Run: grep -n "getColumnIssues" src/lib/queries/issues.ts
      5. Run: grep -n "ProjectInsert\|ColumnInsert" src/lib/database.types.ts
    Expected: Steps 1-2 exit 0, steps 3-5 return empty
    Evidence: .sisyphus/evidence/task-1-dead-code.txt
  ```

  **Commit**: YES
  - Message: `chore: remove dead code (auth.ts, create-issue-dialog, unused exports)`
  - Files: `src/lib/auth.ts`, `src/components/board/create-issue-dialog.tsx`, `src/lib/queries/issues.ts`, `src/lib/database.types.ts`, `src/hooks/use-auth.ts`, `package.json`

- [x] 2. Fix backlog column_id type artifacts

  **What to do**:
  - In `src/lib/database.types.ts`: change `IssueInsert.column_id` from `string | null` to `string`, `IssueUpdate.column_id` from `string | null` to `string | undefined` (optional for partial updates, never null)
  - In `src/lib/queries/issues.ts`: change `moveIssue` param `newColumnId` from `string | null` to `string`; remove `!` from `input.column_id!` in createIssue
  - In `src/routes/board/$boardId.tsx:461`: remove `!` from `issue.column_id!` (type now guarantees non-null)

  **Must NOT do**: Change the database schema (already migrated)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:
  - `src/lib/database.types.ts:126,140` — column_id typed as `string | null`
  - `src/lib/queries/issues.ts:76` — `moveIssue(issueId, newColumnId: string | null, ...)`
  - `src/routes/board/$boardId.tsx:461` — `issue.column_id!` non-null assertion

  **Acceptance Criteria**:

  ```
  Scenario: No nullable column_id
    Tool: Bash
    Steps:
      1. Run: tsc --noEmit
      2. Run: grep -rn "column_id.*null\|column_id!" src/lib/ src/routes/
    Expected: Step 1 exits 0, step 2 returns empty
    Evidence: .sisyphus/evidence/task-2-types.txt
  ```

  **Commit**: YES
  - Message: `fix: tighten column_id types after backlog removal`

- [x] 3. Rewrite useAuth as React Query hook (no context needed)

  **What to do**:
  - Rewrite `src/hooks/use-auth.ts` to use `useQuery` with `staleTime: Infinity` for the user state
  - The auth subscription (`onAuthStateChange`) becomes the cache invalidation mechanism — on auth change, update the query cache via `queryClient.setQueryData`
  - This means all 4 consumers share the same cached user via React Query's deduplication — no Context provider needed
  - Remove `useState` for user/loading/session — derive from `useQuery`
  - Return only `{ user, loading, signOut }` (signIn/signUp/session already removed in Task 1)
  - Verify all 4 consumers still work: header.tsx, sidebar.tsx, dashboard.tsx, $boardId.tsx

  **Must NOT do**: Add Context/Provider; change the auth API surface beyond removing unused returns

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`react-doctor`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Task 6
  - **Blocked By**: None (coordinate with Task 1 on signIn/signUp removal)

  **References**:
  - `src/hooks/use-auth.ts` — current hook with per-component useState + useEffect subscription
  - TanStack Query docs: `staleTime: Infinity` means "never refetch, only invalidate manually"
  - Pattern: `supabase.auth.getUser()` as queryFn, `onAuthStateChange` updates cache via `setQueryData`

  **Acceptance Criteria**:

  ```
  Scenario: Auth via React Query
    Tool: Bash
    Steps:
      1. Run: tsc --noEmit
      2. Run: vite build
      3. Run: grep -rn "useQuery" src/hooks/use-auth.ts
      4. Run: grep -rn "useState" src/hooks/use-auth.ts
      5. Run: grep -rn "AuthProvider\|AuthContext" src/
    Expected: Steps 1-2 exit 0, step 3 returns 1+ match, step 4 returns 0 matches, step 5 returns 0 matches
    Evidence: .sisyphus/evidence/task-3-auth.txt
  ```

  **Commit**: YES
  - Message: `refactor(auth): rewrite useAuth as React Query hook with staleTime Infinity`

- [x] 4. Install React Compiler + deduplicate IssueCard/IssueCardOverlay

  **What to do**:
  - Install `babel-plugin-react-compiler` as devDependency
  - Configure in `vite.config.ts` via `@vitejs/plugin-react`'s babel config:
    ```ts
    react({ babel: { plugins: [["babel-plugin-react-compiler", {}]] } })
    ```
  - In `src/components/board/issue-card.tsx`: extract shared rendering (title, priority dot, labels, due date, avatar) into `IssueCardContent` component
  - `IssueCard` wraps `IssueCardContent` with sortable behavior + interactive styles
  - `IssueCardOverlay` wraps `IssueCardContent` with overlay/shadow styles (w-80 on desktop)
  - Do NOT add manual `React.memo` — the compiler handles memoization automatically
  - Remove any existing unnecessary `useMemo`/`useCallback` wrappers across the codebase that the compiler makes redundant (audit during this task)

  **Must NOT do**: Change the visual output; add manual React.memo/useMemo/useCallback (compiler does it)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`react-doctor`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/board/issue-card.tsx:32-108` — IssueCard component
  - `src/components/board/issue-card.tsx:115-166` — IssueCardOverlay (80% duplicate JSX)
  - `vite.config.ts` — where to add compiler plugin
  - React Compiler docs: https://react.dev/learn/react-compiler

  **Acceptance Criteria**:

  ```
  Scenario: Compiler installed + card deduplicated
    Tool: Bash
    Steps:
      1. Run: tsc --noEmit
      2. Run: vite build
      3. Run: grep -rn "IssueCardContent" src/components/board/issue-card.tsx
      4. Run: grep -rn "react-compiler" vite.config.ts
      5. Run: grep -rn "React.memo\|memo(" src/components/board/
    Expected: Steps 1-2 exit 0, step 3 returns 2+ matches, step 4 returns 1 match, step 5 returns 0 matches (no manual memo)
    Evidence: .sisyphus/evidence/task-4-compiler-dedup.txt
  ```

  **Commit**: YES
  - Message: `refactor: install React Compiler, extract shared IssueCardContent`

- [x] 5. Accessibility fixes

  **What to do**:
  - `src/components/board/filter-bar.tsx:228`: add `aria-label="Search issues"` to desktop search input
  - `src/components/board/filter-bar.tsx:127`: add `aria-label="Search issues"` to mobile search input
  - `src/components/board/column.tsx:117-123`: add accessible label to column name (double-click to rename)
  - `src/routes/board/$boardId.tsx:291`: add `aria-label="Board settings"` to settings button

  **Must NOT do**: Change visual appearance; add new interactive elements

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: None
  - **Blocked By**: None

  **Acceptance Criteria**:

  ```
  Scenario: ARIA labels present
    Tool: Bash
    Steps:
      1. Run: tsc --noEmit
      2. Run: grep -rn "aria-label" src/components/board/filter-bar.tsx
      3. Run: grep -rn "aria-label" src/components/board/column.tsx
    Expected: Step 1 exits 0, step 2 returns 2+ matches, step 3 returns 1+ match
    Evidence: .sisyphus/evidence/task-5-a11y.txt
  ```

  **Commit**: YES
  - Message: `fix(a11y): add missing ARIA labels`

- [ ] 6. Replace data-fetching useEffects with React Query / props

  **What to do**:

  **A) Convert to `queryOptions` + `loader` + `useSuspenseQuery` pattern (TanStack Router + Query integration)**:
  - Create query option factories in `src/lib/query-keys.ts` (repurpose existing file):
    ```ts
    export const boardQueries = {
      columns: (boardId: string) =>
        queryOptions({
          queryKey: ["boards", boardId, "columns"],
          queryFn: () => getProjectColumns(boardId),
        }),
      issues: (boardId: string) =>
        queryOptions({
          queryKey: ["boards", boardId, "issues"],
          queryFn: () => getProjectIssues(boardId),
        }),
      members: (boardId: string) =>
        queryOptions({
          queryKey: ["boards", boardId, "members"],
          queryFn: () => getProjectMembers(boardId),
        }),
      name: (boardId: string) =>
        queryOptions({
          queryKey: ["boards", boardId, "name"],
          queryFn: () => getProjectName(boardId),
        }),
    }
    export const projectQueries = {
      list: (userId: string) =>
        queryOptions({
          queryKey: ["projects", "list"],
          queryFn: () => getUserProjects(userId),
        }),
    }
    ```
  - Add `loader` to `$boardId` route that prefetches all 4 queries in parallel before render:
    ```ts
    loader: ({ params: { boardId } }) =>
      Promise.all([
        queryClient.ensureQueryData(boardQueries.columns(boardId)),
        queryClient.ensureQueryData(boardQueries.issues(boardId)),
        queryClient.ensureQueryData(boardQueries.members(boardId)),
        queryClient.ensureQueryData(boardQueries.name(boardId)),
      ])
    ```
  - In `BoardPage` component, replace `useQuery` with `useSuspenseQuery`:
    ```ts
    const { data: columns } = useSuspenseQuery(boardQueries.columns(boardId))
    const { data: issues } = useSuspenseQuery(boardQueries.issues(boardId))
    ```
    No more `= EMPTY_COLUMNS` defaults, no more `isLoading` checks — data is guaranteed.
  - Same for `dashboard.tsx`: add `loader` with `ensureQueryData`, use `useSuspenseQuery` in component.
  - Add `errorComponent` to routes for error handling (replaces inline error states).
  - Set `defaultPreloadStaleTime: 0` on router so preloads always hit the loader.
  - Keep `beforeLoad` for auth guards only — it runs BEFORE `loader`.

  **B) Fix component data fetching**:
  - `src/components/layout/sidebar.tsx:32-61`: replace manual useState+useEffect Supabase fetch with `useSuspenseQuery` (or `useQuery` since sidebar isn't route-loaded). Remove boards/loading state.
  - `src/components/board/issue-panel.tsx:75-82`: remove getProjectMembers useEffect. Add `members` prop. Parent passes data from `useSuspenseQuery`.
  - `src/components/board/board-settings.tsx:66-83`: remove fetchMembers useEffect + name sync. Add `members` prop.
  - Update `$boardId.tsx` to pass `members` down to IssuePanel and BoardSettings.

  **Must NOT do**: Change data shapes or API contracts; remove the query-keys.ts file

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`react-doctor`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 7)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Tasks 1, 3

  **References**:
  - `src/components/layout/sidebar.tsx:32-61` — manual Supabase fetch pattern
  - `src/components/board/issue-panel.tsx:75-82` — redundant member fetch
  - `src/components/board/board-settings.tsx:66-83` — redundant member fetch + name sync
  - `src/lib/query-keys.ts` — unused helpers to adopt

  **Acceptance Criteria**:

  ```
  Scenario: queryOptions + loader + useSuspenseQuery pattern
    Tool: Bash
    Steps:
      1. Run: tsc --noEmit && vite build
      2. Run: grep -rn "getProjectMembers" src/components/board/issue-panel.tsx src/components/board/board-settings.tsx
      3. Run: grep -rn "setBoards\|setLoading" src/components/layout/sidebar.tsx
      4. Run: grep -rn "useSuspenseQuery" src/routes/board/\$boardId.tsx
      5. Run: grep -rn "ensureQueryData" src/routes/board/\$boardId.tsx
      6. Run: grep -rn "queryOptions" src/lib/query-keys.ts
      7. Run: grep -rn "EMPTY_COLUMNS\|EMPTY_ISSUES\|EMPTY_MEMBERS" src/
    Expected: Steps 1 exits 0, steps 2-3 return empty, steps 4-6 return 1+ match, step 7 returns 0 (no empty defaults needed with suspense)
    Evidence: .sisyphus/evidence/task-6-data-fetch.txt
  ```

  **Commit**: YES
  - Message: `refactor(data): replace useEffect data fetching with React Query and props`

- [x] 7. Tighten type safety

  **What to do**:
  - `src/lib/supabase.ts:4-5`: replace `as string` casts with runtime env validation (throw if missing)
  - `src/components/board/board-settings.tsx:110`: replace `err as { code?: string }` with proper error narrowing (`instanceof Error`)
  - `src/routes/board/$boardId.tsx:178`: same error narrowing pattern
  - `src/components/board/issue-panel.tsx:85`: tighten `saveField` to `<K extends keyof IssueUpdate>(field: K, value: IssueUpdate[K])`
  - Add inline comments to unavoidable Select value casts (Radix always returns string)
  - Parallelize independent queries in `src/lib/queries/projects.ts:12-36` using Promise.all()

  **Must NOT do**: Change runtime behavior; remove error handling

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`react-doctor`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 6)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **Acceptance Criteria**:

  ```
  Scenario: Type safety improved
    Tool: Bash
    Steps:
      1. Run: tsc --noEmit && vite build
      2. Run: grep -rn "as string" src/lib/supabase.ts
      3. Run: grep -rn "err as {" src/
    Expected: Step 1 exits 0, steps 2-3 return empty
    Evidence: .sisyphus/evidence/task-7-types.txt
  ```

  **Commit**: YES
  - Message: `refactor(types): env validation, error narrowing, typed saveField, parallel queries`

- [x] 8. Fix remaining useEffects (autoFocus, key prop, DnD deps)

  **What to do**:
  - `src/components/board/issue-panel.tsx:67-72`: remove title/description sync effect. Use `key={issue?.id}` on the `<IssuePanel>` call in $boardId.tsx. Initialize state from props directly.
  - `src/components/board/column.tsx:55-60`: remove focus useEffect. Add `autoFocus` prop to Input.
  - `src/components/board/add-column-button.tsx:15-19`: remove focus useEffect. Add `autoFocus` to Input.
  - `src/routes/board/$boardId.tsx:121-138`: remove both `eslint-disable-next-line` comments. Add proper deps to both sync effects.
  - `src/components/theme-provider.tsx:181,188`: replace `eslint-disable-line` with documentation comments explaining mount-only intent.

  **Must NOT do**: Break DnD behavior; change the isDragging guard logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`react-doctor`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 9)
  - **Blocks**: None
  - **Blocked By**: Task 6

  **Acceptance Criteria**:

  ```
  Scenario: Effects cleaned up
    Tool: Bash
    Steps:
      1. Run: tsc --noEmit && vite build
      2. Run: grep -rn "eslint-disable" src/ --include="*.ts" --include="*.tsx" | grep -v routeTree.gen
      3. Run: grep -rn "useEffect" src/components/board/column.tsx src/components/board/add-column-button.tsx
    Expected: Step 1 exits 0, steps 2-3 return empty
    Evidence: .sisyphus/evidence/task-8-effects.txt
  ```

  **Commit**: YES
  - Message: `refactor(effects): autoFocus, key prop pattern, fix DnD deps`

- [x] 9. Extract $boardId.tsx into custom hooks

  **What to do**:
  - Create `src/hooks/use-board-dnd.ts`: move `localColumns`, `items`, all refs, `isDragging`, both sync effects, `onDragStart`/`onDragOver`/`onDragEnd` handlers. Hook accepts `{ boardId, columns, issues, queryClient }`. Returns `{ localColumns, isDragging, items, getColumnIssues, dndHandlers }`.
  - Create `src/hooks/use-board-mutations.ts`: move column CRUD handlers (handleCreateColumn, handleRenameColumn, handleDeleteColumn, handleMoveColumn). Hook accepts `{ boardId, queryClient }`. Returns the handlers.
  - BoardPage becomes thin composition layer (~200-300 lines): layout, query hooks, wiring.

  **Must NOT do**: Change any behavior; add features; refactor components beyond extraction

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`react-doctor`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 8)
  - **Blocks**: Tasks 10, 11, 12
  - **Blocked By**: Tasks 2, 6

  **References**:
  - `src/routes/board/$boardId.tsx` — the 617-line god component to break up
  - Official @dnd-kit tutorial pattern: items in state, onDragStart/Over/End handlers, move() helper

  **Acceptance Criteria**:

  ```
  Scenario: BoardPage decomposed
    Tool: Bash
    Steps:
      1. Run: tsc --noEmit && vite build
      2. Run: wc -l src/routes/board/\$boardId.tsx
      3. Run: ls src/hooks/use-board-*.ts
    Expected: Step 1 exits 0, step 2 < 350 lines, step 3 shows 2 files (use-board-dnd.ts, use-board-mutations.ts)
    Evidence: .sisyphus/evidence/task-9-extract.txt
  ```

  **Commit**: YES
  - Message: `refactor(board): extract useBoardDnd and useBoardMutations hooks`

### PHASE 2: MOBILE LIST VIEW + DESKTOP IMPROVEMENTS

- [x] 10. Remove column DragOverlay (cards only)

  **What to do**:
  - In the DragOverlay function-child (currently in $boardId.tsx or board-drag-overlay after extraction), change the `source.type === "column"` branch to return `null` instead of rendering the column preview.
  - Remove the column preview JSX (header + card previews + "N more" text).

  **Must NOT do**: Remove the DragOverlay entirely — cards still need it

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 11, 12)
  - **Blocks**: None
  - **Blocked By**: Task 9

  **Acceptance Criteria**:

  ```
  Scenario: No column overlay
    Tool: Bash
    Steps:
      1. Run: tsc --noEmit && vite build
      2. Verify: DragOverlay function-child returns null for source.type === "column"
    Expected: Step 1 exits 0
    Evidence: .sisyphus/evidence/task-10-no-col-overlay.txt
  ```

  **Commit**: YES (groups with Task 11)
  - Message: `fix(dnd): remove column DragOverlay, cards only`

- [x] 11. Mobile stacked list layout

  **What to do**:
  - On mobile (< md breakpoint), replace horizontal scrolling column layout with vertical stacked sections:

    ```
    [Column Name] (count) [+]
    ├── IssueCard
    ├── IssueCard
    └── IssueCard

    [Column Name] (count) [+]
    ├── IssueCard
    └── IssueCard
    ```

  - Each section header shows column name + issue count + "+" add button
  - Cards are full-width, stacked vertically within each section
  - Sections separated by spacing (not collapsible — all visible)
  - DnD still works: cards sortable within sections, draggable between sections
  - The `useIsMobile` hook already exists for breakpoint detection
  - Desktop layout unchanged (horizontal columns)

  **Must NOT do**: Break desktop layout; remove DnD from mobile; add new npm dependencies

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`, `frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 10, 12)
  - **Blocks**: Task 13
  - **Blocked By**: Task 9

  **References**:
  - `src/hooks/use-mobile.ts` — existing `useIsMobile()` hook
  - Librarian research: Linear/Notion mobile pattern is stacked sections, not horizontal columns
  - `src/components/board/column.tsx` — current column component to conditionally render differently on mobile
  - `src/routes/board/$boardId.tsx` — board layout currently uses `flex` + `overflow-x-auto` for horizontal scroll

  **Acceptance Criteria**:

  ```
  Scenario: Mobile shows stacked list
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport to 375x812 (iPhone)
      2. Navigate to a board with multiple columns and issues
      3. Assert: no horizontal scroll container visible
      4. Assert: column names visible as section headers
      5. Assert: issue cards are full-width
      6. Assert: "+" button visible in each section header
      7. Screenshot
    Expected: Stacked vertical layout, no horizontal scrolling
    Evidence: .sisyphus/evidence/task-11-mobile-list.png

  Scenario: Desktop unchanged
    Tool: Playwright
    Steps:
      1. Set viewport to 1440x900
      2. Navigate to same board
      3. Assert: horizontal column layout preserved
      4. Screenshot
    Expected: Same horizontal column layout as before
    Evidence: .sisyphus/evidence/task-11-desktop-unchanged.png
  ```

  **Commit**: YES
  - Message: `feat(mobile): stacked list layout with section headers`

- [x] 12. Desktop column inline add-issue buttons

  **What to do**:
  - Add a "+" button at the bottom of each column for inline issue creation
  - Clicking "+" shows an inline text input (like the existing add-column pattern)
  - Submitting creates an issue in that column at the last position
  - The button should be subtle: small, muted, with a "+" icon
  - Use the existing `createIssue` function from `src/lib/queries/issues.ts`

  **Must NOT do**: Add a modal/dialog; change the issue creation API; modify the column header

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`, `frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 10, 11)
  - **Blocks**: Task 13
  - **Blocked By**: Task 9

  **References**:
  - `src/components/board/add-column-button.tsx` — existing inline add pattern to follow
  - `src/lib/queries/issues.ts:29-54` — `createIssue` function
  - `src/components/board/column.tsx` — where to add the button (bottom of card list)

  **Acceptance Criteria**:

  ```
  Scenario: Add issue via column button
    Tool: Playwright
    Steps:
      1. Navigate to board with columns
      2. Click "+" button at bottom of a column
      3. Type issue title in inline input
      4. Press Enter
      5. Assert: new issue card appears in the column
    Expected: Issue created in correct column
    Evidence: .sisyphus/evidence/task-12-add-issue.png
  ```

  **Commit**: YES
  - Message: `feat(desktop): column inline add-issue buttons`

### PHASE 3: FINAL POLISH

- [x] 13. Final verification and smoke test

  **What to do**:
  - Run `tsc --noEmit` — zero errors
  - Run `vite build` — clean build
  - Count useEffects in src/components/board/ — should be 2 or fewer
  - Verify zero `eslint-disable` comments in user code
  - Verify $boardId.tsx < 350 lines
  - Verify single auth subscription
  - Smoke test: create board, add columns, create issues, DnD between columns, open issue panel, filter, theme switch
  - Mobile test at 375px: stacked list layout, DnD works, add issue works

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`react-doctor`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (sequential — after all others)
  - **Blocks**: None
  - **Blocked By**: All tasks (1-12)

  **Acceptance Criteria**:

  ```
  Scenario: Full verification
    Tool: Bash + Playwright
    Steps:
      1. Run: tsc --noEmit
      2. Run: vite build
      3. Run: grep -rn "eslint-disable" src/ --include="*.ts" --include="*.tsx" | grep -v routeTree.gen
      4. Run: wc -l src/routes/board/\$boardId.tsx
      5. Run: grep -c "useEffect" src/components/board/*.tsx
      6. Playwright: full smoke test on desktop and mobile viewports
    Expected: All commands pass, all smoke tests pass
    Evidence: .sisyphus/evidence/task-13-final.txt
  ```

  **Commit**: YES (only if fixes needed)
  - Message: `chore: final verification and cleanup`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `tsc --noEmit` + `vite build`. Review all changed files for `as any`, empty catches, console.log in prod, commented-out code, unused imports.
      Output: `Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built.
      Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

- **T1**: `chore: remove dead code (auth.ts, create-issue-dialog, unused exports)`
- **T2**: `fix: tighten column_id types after backlog removal`
- **T3**: `refactor(auth): convert useAuth to shared context provider`
- **T4**: `refactor(components): extract shared IssueCardContent, deduplicate overlay`
- **T5**: `fix(a11y): add missing ARIA labels`
- **T6**: `refactor(data): replace useEffect data fetching with React Query and props`
- **T7**: `refactor(types): env validation, error narrowing, typed saveField`
- **T8**: `refactor(effects): autoFocus, key prop pattern, fix DnD deps`
- **T9**: `refactor(board): extract useBoardDnd, useBoardData, useBoardMutations hooks`
- **T10**: `fix(dnd): remove column DragOverlay, cards only`
- **T11**: `feat(mobile): stacked list layout with section headers`
- **T12**: `feat(desktop): column inline add-issue buttons`
- **T13**: `chore: final verification and cleanup`

---

## Success Criteria

### Verification Commands

```bash
npx tsc --noEmit  # Expected: 0 errors
npm run build     # Expected: clean build
grep -rn "eslint-disable" src/ --include="*.ts" --include="*.tsx" | grep -v routeTree.gen  # Expected: 0 results
wc -l src/routes/board/\$boardId.tsx  # Expected: < 300
grep -rn "onAuthStateChange" src/  # Expected: 1 occurrence (in AuthProvider)
grep -rn "from \"@/lib/auth\"" src/  # Expected: 0 results
```

### Final Checklist

- [ ] All dead code removed
- [ ] All useEffects are necessary (no derived-state effects, no data-fetch effects)
- [ ] Single auth subscription via Context
- [ ] $boardId.tsx < 300 lines
- [ ] Mobile shows stacked list layout
- [ ] Desktop shows columns with "+" buttons
- [ ] Column DragOverlay removed
- [ ] TypeScript strict passes
- [ ] Build passes
