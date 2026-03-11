# Learnings — toad-kanban

## Project Context
- Supabase URL: https://wdnzqeilwqjuyjeaxjbs.supabase.co
- Supabase publishable key: sb_publishable_VPfgl4YhN_4ar1nju9QMVw_x7BUg2eT
- .env already exists at project root with these values
- Stack: TanStack Start SPA + Supabase JS (no ORM) + @dnd-kit/react (new API, NOT legacy @dnd-kit/core) + shadcn + tweakcn themes

## Critical Patterns
- ALL env vars must use VITE_ prefix (import.meta.env.VITE_*)
- SPA mode: `spa: { enabled: true }` in tanstackStart plugin in vite.config.ts
- Vercel rewrite MUST target `/_shell.html` (not `/`)
- RLS policies MUST use `(select auth.uid())` wrapper — NOT bare auth.uid() (performance: 179ms → 9ms)
- ALL RLS policies use `TO authenticated` role
- SECURITY DEFINER functions need `SET search_path = ''`
- @dnd-kit: use `onDragOver` for state updates (NOT onDragEnd) to avoid removeChild error
- touch-action: none on draggable cards for mobile

## Key Dependencies
- @dnd-kit/react@^0.3.2, @dnd-kit/helpers@^0.3.2, @dnd-kit/abstract (new API)
- @supabase/supabase-js
- NO @dnd-kit/core (legacy forbidden)
- NO ORM (Drizzle, Prisma forbidden)
- NO next-themes (implement manually)
- NO Google/OAuth (email+password only)

## Task 1: Project Scaffold + SPA Config (COMPLETED)

### Scaffolding Process
- `npx shadcn@latest init -t start` requires interactive prompts for monorepo, component library, and preset
- Use flags to skip interactivity: `--base radix --no-monorepo -p nova --yes`
- Project name prompt still requires stdin input (echo "toad" | npx shadcn...)
- Scaffolding creates subdirectory named after project — must move contents to root with `mv toad/* . && mv toad/.* .`

### SPA Mode Configuration
- vite.config.ts: tanstackStart plugin accepts options object with `spa: { enabled: true }`
- Build output includes `_shell.html` in `.output/public/` when SPA mode enabled
- Vercel rewrite correctly targets `/_shell.html` for SPA routing

### Build Verification
- `npm run build` succeeds with SPA mode enabled
- Prerender step crawls `/` and generates static shell
- Environment variables loaded from .env (VITE_SUPABASE_URL, VITE_SUPABASE_KEY)
- Build output structure: `.output/public/` contains assets and `_shell.html`

### Files Created
- vite.config.ts: Added `spa: { enabled: true }` to tanstackStart plugin
- vercel.json: Rewrite rule for SPA routing
- .env.example: Template with VITE_SUPABASE_URL and VITE_SUPABASE_KEY placeholders
- .env: Preserved existing credentials (not overwritten)

## Task: 001_initial_schema.sql (completed 2026-03-11)
- `(SELECT auth.uid())` wrapper is non-negotiable for RLS perf (179ms → 9ms per Supabase docs)
- `private.is_project_member` as SECURITY DEFINER + `SET search_path = ''` avoids search_path injection
- `grep -c "ENABLE ROW LEVEL SECURITY"` returns 6 not 5 — comment section header also matches; use `grep -c "ALTER TABLE.*ENABLE ROW LEVEL SECURITY"` for accurate count
- `issues.column_id` uses `ON DELETE RESTRICT` deliberately — prevents orphaned issues
- `project_members.user_id` nullable supports email-invite-before-signup flow
- `claim_pending_invites` trigger auto-links pending rows on auth.users insert

## Task 3: Supabase Client Module + Types (completed 2026-03-11)
- `@supabase/supabase-js` installed (9 packages added, 0 vulnerabilities)
- `src/lib/supabase.ts`: typed client using `createClient<Database>` with `import.meta.env.VITE_*` vars
- `src/lib/database.types.ts`: Full Database interface for 5 tables (profiles, projects, project_members, columns, issues) with Row/Insert/Update types + convenience aliases
- `src/lib/queries/` dir created with `.gitkeep` — ready for future query modules
- `npx tsc --noEmit` passes clean, LSP diagnostics clean on both files

## Task 7: Migration Application Attempt (2026-03-11)
- Supabase CLI v2.78.1 available via npx but requires auth (`sbp_...` personal access token)
- `supabase login` without a token errors: "Invalid access token format"
- Publishable key (anon key) only works for PostgREST API, NOT for Management API or SQL execution
- No `config.toml` in `supabase/` dir — only `migrations/` subfolder exists
- Migration must be applied manually via Dashboard SQL Editor when no access token is available
- REST API returns `PGRST205` (not `42P01`) when table not in schema cache — error code may differ from docs


## Task 6 — App Shell Layout + Route Structure
- TanStack Router route tree must be regenerated after adding new route files: `npx @tanstack/router-cli generate`
- Without regeneration, all route paths show type errors (e.g. `"/dashboard"` not assignable to `"/"`)
- shadcn sidebar installs 7 files including tooltip, input, skeleton, sheet as dependencies
- Unused props in TS strict mode need `_` prefix to avoid `TS6133` (declared but never read)
- Route files auto-detected: `src/routes/login.tsx` → `/login`, `src/routes/board/$boardId.tsx` → `/board/:boardId`

 ## Task 4: Vercel Deployment (completed 2026-03-11)
- Vercel project: `snacksncodes-projects/toad`
- **Production URL: https://toad-one.vercel.app**
- Deployment URL (specific): https://toad-nl4ptw7oi-snacksncodes-projects.vercel.app
- Inspect: https://vercel.com/snacksncodes-projects/toad/7diAjL1ff6cZzrSzBLAMtER8wvKG
- GitHub repo auto-connected: https://github.com/snacksncode/toad
- Nitro auto-detects `vercel` preset when deploying to Vercel (builds to `.vercel/output/`)
- `vercel.json` rewrites work alongside Nitro's serverless function — SSR + SPA fallback both work
- Had to create missing `src/components/theme-provider.tsx` (passthrough wrapper) and `src/components/theme-toggle.tsx` (placeholder sun icon button) — these were imported in `__root.tsx` and `header.tsx` but never created
- Env vars set: `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (production only)
- Redeployed after setting env vars to pick them up
- `vercel --yes --prod` auto-links project, creates `.vercel/` dir, adds to `.gitignore`

## Task 5: Theme System + Dark/Light Toggle (completed 2026-03-11)
- tweakcn.com has no public API for theme presets; `/r/themes` and `/api/themes` return 404
- Theme presets live in `utils/theme-presets.ts` in the tweakcn GitHub repo (jnsahaj/tweakcn)
- tweakcn presets use hex colors, not oklch — cannot directly copy for oklch-based project
- Default theme in `config/theme.ts` uses oklch format and was used as the base reference
- oklch color space: L=lightness(0-1), C=chroma(0-0.4), H=hue(0-360)
  - Hue ranges: red ~25, orange ~60, yellow ~85, green ~145, teal ~185, blue ~245, violet ~295, rose ~350
- `styles.css` uses `@custom-variant dark (&:is(.dark *))` — class-based dark mode on `<html>`
- Theme vars applied via `document.documentElement.style.setProperty()` which overrides `:root` CSS
- localStorage keys: `toad-theme` (theme id) and `toad-color-mode` ("light"|"dark")
- Files created: `src/lib/themes.ts` (12 themes), `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`
- theme-provider.tsx and theme-toggle.tsx already existed as stubs — used Edit tool to replace content

## [2026-03-11] Task 9: Avatar Utility
- Utility in `src/lib/avatar.ts`, component in `src/components/avatar.tsx`
- Used inline hex colors via `style={{ backgroundColor }}` rather than Tailwind classes — avoids dynamic class purging issues and works cleanly with both light/dark modes
- `as const` on color array keeps TypeScript happy without needing explicit type annotation
- `text-white` works for all 12 avatar colors since they're mid-saturation values picked for contrast
- `select-none shrink-0` prevents text selection and flex shrinking — important for avatar in flex layouts
- Hash function: simple char code sum modulo array length — deterministic and fast
- Component uses `NonNullable<AvatarProps["size"]>` for the size class map key type — avoids duplicating the union

## [2026-03-11] Task 8: Auth System
- `supabase.auth.signInWithPassword()` and `supabase.auth.signUp()` return `{ data, error }` — destructure `error` for user-facing messages
- TanStack Router `beforeLoad` works for both route protection (redirect unauthed to /login) and auth page guards (redirect authed to /dashboard) — use `throw redirect({ to: "..." })`
- `supabase.auth.onAuthStateChange()` returns `{ data: { subscription } }` — call `subscription.unsubscribe()` in useEffect cleanup
- `supabase.auth.getSession()` is synchronous from cache after first call — safe to use in `beforeLoad` without performance concern
- shadcn Card/Label installed via `npx shadcn add card label` — Card has CardHeader, CardTitle, CardDescription, CardContent, CardFooter slots
- `user.email` from Supabase auth is `string | undefined` — use `?? ""` when passing to Avatar component
- DropdownMenu from shadcn/radix works well for user menu in header — trigger with ghost button wrapping Avatar
- Login/signup forms use controlled inputs with useState — no form library needed for simple email/password flows
- Lucide `Loader2` with `animate-spin` class is the standard loading spinner pattern in shadcn projects
- `useAuth()` hook pattern: initial `getSession()` call sets loading=false, then `onAuthStateChange` handles reactive updates — no context provider needed when hook is used directly

## [2026-03-11] Task 11: Board View + Column CRUD

### Critical: Database Types Required Structural Fix
- `@supabase/supabase-js` v2.99.1 requires `Database['public']` to extend `GenericSchema` which needs `Tables` (each with `Relationships: []`), `Views`, and `Functions` fields
- Without these, the `SupabaseClient` type resolves `Schema` to `never` (not `any`), making ALL `.from()` queries untyped
- Fix: Added `Relationships: []` to each table, plus `Views: Record<string, never>` and `Functions: Record<string, never>` to `public` schema
- This is a known issue with manually-created (vs generated) Supabase types

### Sonner Toast Component Fix
- `npx shadcn add sonner` generates component using `next-themes`'s `useTheme` hook
- Project uses custom theme provider (`@/components/theme-provider`) — updated import to use `colorMode` from custom provider
- `Toaster` component added to `__root.tsx` inside `ThemeProvider`

### Supabase Join Queries and TypeScript
- Join syntax `projects(id, name)` in `.select()` doesn't type correctly without `Relationships` definitions in the Database type
- Workaround: use two separate queries (get IDs first, then fetch related records) for proper type safety
- Explicit column selection in `.select("id, project_id, name, position, created_at")` provides better type inference than `.select("*")`

### Column CRUD Patterns
- `reorderColumns`: Can't use `.upsert()` for position-only updates because Insert type requires all non-optional fields (name, project_id). Used individual `.update()` calls with `Promise.all()` instead
- Delete column with FK violation: PostgreSQL error code `23503` (foreign_key_violation) from RESTRICT constraint
- Optimistic reorder: update local state immediately, then `Promise.all` updates, refetch on success/failure

### Files Created/Modified
- `src/lib/queries/columns.ts` — getProjectColumns, createColumn, updateColumn, reorderColumns, deleteColumn
- `src/components/board/column.tsx` — Column with inline rename (double-click), kebab menu (rename/move/delete), empty body placeholder
- `src/components/board/add-column-button.tsx` — Dashed border button that expands to inline input form
- `src/routes/board/$boardId.tsx` — Full board view with horizontal scrollable column layout, project name header, loading state
- `src/components/layout/sidebar.tsx` — Real board list from project_members + projects tables, active board highlighting
- `src/components/ui/sonner.tsx` — Fixed to use custom theme provider
- `src/routes/__root.tsx` — Added Toaster component
- `src/lib/database.types.ts` — Added Relationships/Views/Functions structural fields (required by Supabase client)

## T13: Theme Picker Settings Page

- `useTheme()` from `@/components/theme-provider` exposes `{ theme: string, setTheme: (id) => void, colorMode: "light" | "dark", toggleColorMode: () => void }`
- Theme persistence is handled by ThemeProvider via `localStorage` keys `toad-theme` and `toad-color-mode` — no extra work needed
- `themes` array from `@/lib/themes` has 12 themes, each with `id`, `name`, `cssVars.light`, `cssVars.dark` — all colors in `oklch(...)` format
- oklch values work directly as CSS color values in inline `style={{ background: "oklch(...)" }}`
- shadcn `Card` has built-in `ring-1 ring-foreground/10` — use `cn()` (twMerge) to override with `ring-2 ring-primary` for active state
- Card `size="sm"` gives `gap-3 py-3` — good for compact gallery cards
- For interactive cards, add `role="button" tabIndex={0} onKeyDown` for keyboard accessibility
- Mini UI preview inside each card (colored rectangles mimicking a UI layout) is more visually informative than plain color dots
- Show swatches using `colorMode`-appropriate variant (`cssVars.dark` or `.light`) so they reflect what user will actually see

## [2026-03-11] Task 10: Dashboard Home + Board List

### Supabase Join Typing with Empty Relationships
- `database.types.ts` has `Relationships: []` on all tables — Supabase join syntax `projects(*)` in `.select()` produces `never` type
- Workaround: use separate queries (1. get project_ids from project_members, 2. fetch projects by id, 3. get member counts) — fully typed without casts
- This is the same pattern used in Task 11 for column queries — consistent approach across the codebase

### Dashboard Architecture
- `getUserProjects(userId)`: 3 queries — memberships → project IDs → projects + member counts. All typed cleanly via explicit `.select()` column lists
- `createProject(name, userId, userEmail)`: 3 sequential inserts — project → project_member (owner) → 3 default columns (To Do, In Progress, Done)
- After board creation, auto-navigate to `/board/$boardId` via TanStack Router `useNavigate()`
- Two `CreateBoardDialog` instances share same `open`/`onOpenChange` state — header button and empty state CTA both control one dialog

### Component Patterns
- `BoardCard`: wraps shadcn `Card` inside TanStack `Link` — entire card clickable, keyboard accessible via Link's built-in a11y
- `CreateBoardDialog`: controlled dialog with `open`/`onOpenChange` props + optional `trigger` for `DialogTrigger`
- Dialog form resets `name` state on close via `onOpenChange` handler
- `ProjectWithMemberCount` extends `Project` with `memberCount: number` — exported type for reuse

### Files Created
- `src/lib/queries/projects.ts` — getUserProjects(), createProject()
- `src/components/board-card.tsx` — BoardCard (card with name, member count, date)
- `src/components/create-board-dialog.tsx` — CreateBoardDialog (form dialog)
- `src/routes/dashboard.tsx` — Full dashboard with grid, empty state, loading skeletons
- `src/components/ui/dialog.tsx` — shadcn dialog component (installed via `npx shadcn add dialog`)

## [2026-03-11] Task 12: Board Settings + Member Management

### Architecture Decisions
- `BoardSettings` is a controlled Sheet component with `open`/`onOpenChange` props — same pattern as `CreateBoardDialog`
- `onRename` and `onDelete` callbacks are async functions passed from the board route — keeps settings component decoupled from navigation/query logic
- Owner check: find current user in member list by `user_id === currentUserId`, check `role === 'owner'` — no extra API call needed
- Member status: `user_id !== null` = Active, `user_id === null` = Pending — matches `claim_pending_invites` trigger flow

### Supabase Query Patterns
- `addMember`: INSERT with `.select().single()` returns the created row — useful for optimistic UI
- `removeMember`: DELETE by member id, not by email — avoids needing composite key lookup
- `updateProject`/`deleteProject`: simple UPDATE/DELETE by project id — CASCADE handles cleanup on delete
- Duplicate invite handling: PostgreSQL error code `23505` (unique_violation) on `(project_id, invited_email)` constraint

### Component Patterns
- AlertDialog from shadcn wraps radix AlertDialogPrimitive — `AlertDialogAction` accepts `variant="destructive"` via Button composition
- Badge component has `default`, `secondary`, `outline`, `ghost` variants — used `default` for owner role, `secondary` for member, `outline` for active status, `ghost` for pending
- Settings gear icon uses `ml-auto` to push to right side of flex header bar — avoids separate justify-between container
- Sheet `side="right"` with `overflow-y-auto` on SheetContent for scrollable member lists

### Files Created/Modified
- `src/lib/queries/members.ts` — getProjectMembers, addMember, removeMember
- `src/components/board/board-settings.tsx` — Sheet with rename, member management, danger zone
- `src/lib/queries/projects.ts` — added updateProject, deleteProject (existing getUserProjects + createProject preserved)
- `src/routes/board/$boardId.tsx` — added Settings gear icon, BoardSettings component, useNavigate for post-delete redirect
- `src/components/ui/alert-dialog.tsx` — installed via `npx shadcn add alert-dialog`
- `src/components/ui/badge.tsx` — installed via `npx shadcn add badge`

## [2026-03-11] Task 14: Issue CRUD + Card Rendering

### Query Patterns
- `createIssue` uses two-step approach: SELECT MAX(position) then INSERT with position+1 — Supabase doesn't support subqueries in INSERT
- `Omit<IssueInsert, 'position'>` for createIssue input type — position is auto-calculated, caller shouldn't set it
- `ISSUE_COLUMNS` constant for explicit `.select()` — matches pattern from columns.ts for type safety
- `reorderIssues` uses same `Promise.all` individual update pattern as `reorderColumns` — consistent approach

### IssueCard Component
- Used `<button>` element instead of `<div>` for the card — proper semantics for clickable elements, gets keyboard a11y for free
- `touch-action: none` applied via inline `style` — required for @dnd-kit drag-and-drop (T17), added now to avoid rework
- `line-clamp-2` for title truncation — Tailwind v4 utility for 2-line text overflow
- Priority dots: red=high, amber=medium, emerald=low — small 8px circles positioned top-right inline with title
- Due date parsing: append `T00:00:00` to YYYY-MM-DD string before `new Date()` — avoids timezone offset issues
- Overdue check: compare with today at midnight (setHours 0,0,0,0) — red text + font-medium for overdue dates
- Labels: show max 3 as chips with `+N` overflow indicator — chips use `text-[10px]` for compact size

### CreateIssueDialog Component
- Form resets all state in `useEffect` on `open` change — prevents stale data when reopening
- Labels input: add on Enter/comma key, also add on blur — handles common user patterns
- Assignee dropdown populated from `getProjectMembers(projectId)` — fetched on dialog open
- Radix Select with empty string value for "Unassigned" option — `assigneeEmail || null` converts to null for DB
- Simple `<input type="date">` for due date — avoids shadcn Calendar/Popover complexity for v1
- shadcn `select` and `textarea` components installed via `npx shadcn@latest add select textarea`

### Wiring Issues into Board
- `issues` state lives in board route, fetched via `getProjectIssues(boardId)` — single fetch for all issues, filtered per column
- `issues.filter(i => i.column_id === col.id)` in JSX — simpler than pre-building a Map for the current column count
- `onIssueCreated` handler refetches all issues — simpler than optimistic insert + position calculation
- Column component now accepts `projectId`, `issues`, `onIssueClick`, `onIssueCreated` props
- Issue count badge in column header uses `issues.length` instead of hardcoded `0`
- Footer "Add issue" button wraps `CreateIssueDialog` trigger — no longer disabled

### Files Created/Modified
- `src/lib/queries/issues.ts` — 7 functions: getColumnIssues, getProjectIssues, createIssue, updateIssue, deleteIssue, moveIssue, reorderIssues
- `src/components/board/issue-card.tsx` — Compact card with title, priority dot, labels, due date, assignee avatar
- `src/components/board/create-issue-dialog.tsx` — Full creation form with title, description, priority, labels, assignee, due date
- `src/components/board/column.tsx` — Added issues/projectId props, IssueCard rendering, CreateIssueDialog in footer
- `src/routes/board/$boardId.tsx` — Added issues state, fetchIssues, handleIssueCreated, pass issues to columns
- `src/components/ui/select.tsx` — shadcn select component (installed)
- `src/components/ui/textarea.tsx` — shadcn textarea component (installed)

## [2026-03-11] Task 15: Issue Side Panel

### Architecture
- `IssuePanel` is a controlled Sheet (`open`/`onOpenChange`) — same pattern as `BoardSettings`
- Props: `issue`, `projectId`, `columns`, `open`, `onOpenChange`, `onIssueUpdated`, `onIssueDeleted`
- `selectedIssue` state lives in board route, set via `onIssueClick` passed down through Column to IssueCard
- Column already had `onIssueClick?: (issue: Issue) => void` prop from T14 — just needed to wire it from board route

### Auto-Save Pattern
- Text inputs (title, description): save on blur. Title also commits on Enter key via `e.currentTarget.blur()`
- Select dropdowns (priority, column, assignee): save immediately on `onValueChange`
- Date input: save on `onChange` event
- Labels: save on add (Enter key or button click) and on remove (chip click)
- All saves call `updateIssue(issueId, { field: value })` then `onIssueUpdated(updated)` to sync parent state
- Column change uses `moveIssue(issueId, newColumnId, 999)` — position 999 places at end of target column

### Component Details
- Sheet `side="right"` with `sm:max-w-[480px]` override for wider panel
- `SheetTitle` and `SheetDescription` use `sr-only` class — accessibility without visual clutter
- Assignee dropdown fetches members via `getProjectMembers(projectId)` in useEffect — cached in local state
- "Unassigned" option uses sentinel value `"unassigned"` — converted to `null` before saving
- Labels: chips with hover-to-reveal X icon, inline input with Plus button for adding
- Delete button in SheetFooter wraps AlertDialog for confirmation — uses `variant="destructive"` on both trigger and action

### Board Route Wiring
- `selectedIssue` state: `useState<Issue | null>(null)`, set by `onIssueClick`, cleared by panel close
- `onIssueUpdated`: updates issue in `issues` array AND updates `selectedIssue` to keep panel in sync
- `onIssueDeleted`: filters issue from array AND clears `selectedIssue` (closes panel)
- `onIssueClick` passed to each `<Column>` which already forwards to `<IssueCard onClick>`

### Files Created/Modified
- `src/components/board/issue-panel.tsx` — New Sheet component with all issue fields editable + delete
- `src/routes/board/$boardId.tsx` — Added selectedIssue state, IssuePanel import/render, onIssueClick wiring

## [2026-03-11] Task 18: Filter Bar

### Architecture
- `FilterState` interface exported from `filter-bar.tsx` — reused in board route for state typing
- Filter state is client-side only (no URL params, no DB persistence) — simple `useState` in board route
- `filteredIssues` computed via `useMemo([issues, filters])` — prevents re-filtering on unrelated re-renders
- `FilterBar` renders above columns, inside the flex column layout but outside `<main>` — stays fixed while columns scroll

### Radix Select + "All" Option Pattern
- Radix UI Select requires non-empty string values — used `"__all__"` sentinel for "All X" options
- Map sentinel back to `null` in `onValueChange`: `v === ALL ? null : v`
- Map `null` filter to sentinel for controlled value: `filters.assigneeEmail ?? ALL`
- This avoids fighting Radix's controlled value constraints

### Component Details
- Search input: 7px tall with `pl-7` for search icon overlay, `w-48` fixed width
- Select dropdowns use `size="sm"` (h-7) for compact appearance matching search input height
- Labels dropdown conditionally rendered: `uniqueLabels.length > 0` — hidden when no labels exist across any issue
- Clear button + count text wrapped in fragment, only shown when `hasActiveFilter` is true
- Count shows `filteredCount of totalCount` with `tabular-nums` for aligned numbers

### Board Route Integration
- Added `useMemo` import, `getProjectMembers` import, `ProjectMember` type import
- `members` state + `fetchMembers` callback added — fetched in parallel with board/columns/issues via `Promise.all`
- Members fetch failure is non-critical (silent catch) — filter still works, just no assignee options
- `FilterBar` placed between board header and `<main>` — `{!loading && <FilterBar />}` avoids flash before data loads
- Columns now receive `filteredIssues.filter(...)` instead of `issues.filter(...)` — single change point

### Files Created/Modified
- `src/components/board/filter-bar.tsx` — New component with search + 3 select dropdowns + clear button + count
- `src/routes/board/$boardId.tsx` — Added filter state, members fetch, filteredIssues memo, FilterBar render

## [2026-03-11] Task 16: Quick-Add (Inline + Mobile FAB)

### InlineAdd Component
- Replaces the `CreateIssueDialog` trigger in column footer — simpler inline input for title-only quick creation
- State machine: collapsed ("Add issue" button) → expanded (autofocused input) → submitting (disabled + spinner)
- Enter key: submit if non-empty, Escape key: collapse, blur with empty: collapse
- After successful creation: stays expanded with input cleared for rapid sequential entry
- `createIssue` called with minimal fields: `{ column_id, project_id, title, priority: 'medium', labels: [] }`
- Position auto-calculated by `createIssue` (MAX(position) + 1) — no need to pass position

### QuickAddFab Component
- `fixed bottom-4 right-4 z-50 md:hidden` — only visible on mobile (<768px)
- Uses Dialog (not Sheet) for the creation form — keeps it focused and centered
- Column picker uses shadcn Select, defaults to first column (`columns[0]?.id ?? ""`)
- Form resets (title + selectedColumnId) on each open — prevents stale state
- Returns `null` when `columns.length === 0` — no FAB when board has no columns

### Integration Changes
- `column.tsx`: removed `CreateIssueDialog` import, replaced footer with `<InlineAdd>` component
- `column.tsx`: removed `Plus` from lucide imports (no longer needed in column, InlineAdd has its own)
- `$boardId.tsx`: `QuickAddFab` rendered as sibling of `IssuePanel` inside SidebarProvider — always visible, not inside overflow-hidden main
- Both components share same `onCreated` → `handleIssueCreated` → `fetchIssues()` pattern for data refresh

## [2026-03-11] Task 17: Drag-and-Drop (DnD) Integration

### @dnd-kit/react New API
- `@dnd-kit/react` (NOT `@dnd-kit/core`) — completely different API surface
- `DragDropProvider` from `@dnd-kit/react` — wraps the DnD area, accepts `onDragStart`, `onDragOver`, `onDragEnd`
- `useSortable` from `@dnd-kit/react/sortable` — combines draggable + droppable for list items
- `useDroppable` from `@dnd-kit/react` — makes an element a drop target (used on columns)
- `move` from `@dnd-kit/helpers` — handles `Record<string, string[]>` state updates
- `CollisionPriority` from `@dnd-kit/abstract` — enum for collision priority (Lowest=0, Low=1, Normal=2, High=3, Highest=4)

### Key Architecture Decisions
- Parallel `items: Record<string, string[]>` state maps columnId → issueId[] for visual ordering during drag
- `items` is synced from `issues` + `columns` via useEffect — single source of truth when not dragging
- During drag: `onDragOver` optimistically updates `items` via `move(items, event)`
- `onDragEnd` persists to Supabase, reverts to snapshot on cancel or failure
- `itemsRef` keeps latest items in a ref for async `onDragEnd` handler (avoids stale closure)
- `getColumnIssues(columnId)` derives rendered issues from `items` order + `filteredIssueIds` set — filters still work

### useSortable Configuration
- `{ id: issue.id, index, type: "item", accept: ["item"], group: columnId, collisionPriority: CollisionPriority.Normal }`
- `group` prop is the column ID — enables cross-column sorting
- `type` and `accept` must match for items to be sortable with each other
- Returns `{ ref, isDragSource }` — `ref` attached to the DOM element, `isDragSource` for visual feedback

### useDroppable Configuration
- `{ id: column.id, type: "column", accept: ["item"], collisionPriority: CollisionPriority.Low }`
- `CollisionPriority.Low` on columns ensures items take precedence over columns for collision detection
- Returns `{ ref, isDropTarget }` — `ref` on column body, `isDropTarget` for highlight ring

### Persistence Strategy
- Cross-column: `moveIssue(issueId, newColumnId, position)` then `reorderIssues()` for both columns
- Same-column: `reorderIssues(columnId, orderedIds)` only
- After successful persist: `fetchIssues()` refetches all issues to sync with DB
- On failure: revert `items` to snapshot and show toast error

### Visual Feedback
- Dragged card: `opacity-50 shadow-lg ring-2 ring-primary/30 scale-[1.02]` via `isDragSource` conditional class
- Drop target column: `ring-2 ring-primary/40 border-primary/30` via `isDropTarget` conditional class
- Empty column shows "Drop here" text when `isDropTarget` is true
- `touch-action: none` preserved on IssueCard `<button>` via style prop (already existed)

### DOM DroppableInput Quirk
- Abstract `@dnd-kit/abstract` has `collisionDetector: CollisionDetector` as REQUIRED
- DOM layer `@dnd-kit/dom` makes it OPTIONAL via `Omit<DroppableInput, 'collisionDetector'>` pattern
- Both `useDroppable` and `useSortable` use the DOM layer's optional version — no need to provide collisionDetector

### Files Modified
- `src/routes/board/$boardId.tsx` — DragDropProvider wrap, items state, drag handlers, getColumnIssues
- `src/components/board/column.tsx` — useDroppable, droppableRef on body, isDropTarget highlight, index/columnId props to IssueCard
- `src/components/board/issue-card.tsx` — useSortable, ref on button, isDragSource styling, new index/columnId props

## [2026-03-11] Task 19: Mobile Responsive Polish + Touch DnD Tuning

### @dnd-kit/react Sensor Configuration
- `DragDropProvider` accepts `sensors` prop via `DragDropManagerInput` from `@dnd-kit/dom`
- `PointerSensor.configure(options)` returns a sensor descriptor — pass in `sensors` array
- `PointerActivationConstraints.Delay` and `.Distance` from `@dnd-kit/dom` — construct with `{ value, tolerance }`
- `activationConstraints` can be a function: `(event: PointerEvent, source: Draggable) => ActivationConstraint[] | undefined`
- Use `event.pointerType === 'touch'` to differentiate touch vs mouse input
- DEFAULT behavior already has 250ms touch delay, 200ms+10px+5px distance for other inputs — we made it explicit
- Import `PointerSensor` from `@dnd-kit/react` (re-exported), `PointerActivationConstraints` from `@dnd-kit/dom` directly

### Mobile Responsive Patterns
- Board header: `px-3 sm:px-6 py-3 sm:py-4` — reduced padding on mobile
- Board header column count: `hidden sm:inline` — hidden on mobile to save space
- Board columns container: `gap-3 sm:gap-4 p-3 sm:p-6` — tighter spacing on mobile
- Filter bar: `overflow-x-auto` + `px-3 sm:px-6` — horizontally scrollable on mobile with reduced padding
- Filter search input: `w-36 sm:w-48` — narrower on mobile
- Issue card: `min-h-11` (44px) — ensures touch-friendly tap target per WCAG guidelines

### Already Mobile-Ready (Verified)
- Sidebar: shadcn `SidebarProvider` with offcanvas mobile mode (`hidden md:flex` on inner sidebar)
- `SidebarTrigger` in header provides hamburger menu on mobile
- `QuickAddFab`: `md:hidden` — FAB visible only on mobile
- Column body: `overflow-y-auto` — scrollable when tall content
- Main board area: `overflow-x-auto overflow-y-hidden` — horizontal scroll for columns
- Columns: `w-72 shrink-0` — fixed width, natural horizontal scroll
- Header: `h-14` compact height works on mobile

### Files Modified
- `src/routes/board/$boardId.tsx` — Sensor config, responsive padding/spacing
- `src/components/board/filter-bar.tsx` — Horizontal scroll + responsive padding/width
- `src/components/board/issue-card.tsx` — min-h-11 touch target
