# Toad — Kanban Board & Issue Tracker

## TL;DR

> **Quick Summary**: Build a personal kanban board / issue tracker deployed on Vercel. TanStack Start SPA + Supabase (Postgres + Auth) + @dnd-kit/react for drag-and-drop + shadcn/tweakcn for themed UI. Email+password auth, multi-board support, customizable columns, drag-and-drop issues, side panel detail view, quick-add from mobile.
>
> **Deliverables**:
> - Fully functional kanban board app at a Vercel URL
> - Email+password auth with email-based project collaboration
> - Multi-board dashboard with customizable columns per board
> - Drag-and-drop issue management with side panel editing
> - Theme picker gallery (10-15 tweakcn presets) + dark/light toggle
> - Responsive mobile-friendly design
>
> **Estimated Effort**: Medium-Large (20 implementation tasks)
> **Parallel Execution**: YES — 8 waves, max 5 concurrent
> **Critical Path**: Scaffold → Supabase client → Auth → Board+Columns → Issue CRUD → DnD/Side Panel → Polish → Deploy
> **QA**: Deferred — implementation only, no Playwright verification for now
> **Parallel Execution**: YES — 8 waves, max 5 concurrent
> **Critical Path**: Scaffold → Supabase client → Auth → Board+Columns → Issue CRUD → DnD/Side Panel → Polish → Deploy

---

## Context

### Original Request
User wants a kanban board / issue tracker for personal use with girlfriend. Primary use case: quickly log issues from phone or laptop, manage them on a Trello-style board with drag-and-drop. Must deploy on Vercel for easy URL sharing.

### Interview Summary
**Key Decisions**:
- **Auth**: Email+password via Supabase Auth (no Google OAuth — simplified)
- **Collaboration**: Add email to `project_members` table. When that person signs up, projects auto-appear. No invite emails sent.
- **Avatars**: First letter of email + deterministic color from hash. No uploads.
- **Storage**: Supabase (Postgres) with JS client directly (no ORM)
- **DnD**: `@dnd-kit/react` new API (not legacy `@dnd-kit/core`)
- **UI**: shadcn (official TanStack Start support) + tweakcn themes
- **Issue model**: Title, description, priority (low/med/high), labels (text array), assignee email, due date (YYYY-MM-DD)
- **Columns**: Customizable per board (create, rename, reorder, delete)
- **Board nav**: Dashboard home (boards as cards) + sidebar inside board for quick switching
- **Issue detail**: Side panel sliding from right (like Linear)
- **Quick-add**: Inline '+' at bottom of columns (desktop) + floating FAB (mobile)
- **Filters**: Basic filter bar (assignee, priority, label, title search)
- **Themes**: Gallery of ~10-15 tweakcn presets + dark/light toggle in settings
- **Mobile**: Responsive design, secondary priority (not PWA)
- **Realtime**: No (manual refresh)
- **Offline**: No
- **Tests**: No automated tests for v1

### Metis Review
**Identified Gaps** (addressed):
- **Supabase RLS performance**: Must use `(select auth.uid())` wrapper (179ms → 9ms). All policies use `TO authenticated` role. Private schema for helper functions.
- **dnd-kit Safari regression**: v0.3.x has drag offset bug on Safari (#1910). Will test in Wave 2 and fall back to v0.2.4 if broken.
- **TanStack Start SPA shell path**: Vercel rewrites must target `/_shell.html`, not `/`.
- **Hydration bug on direct navigation**: TanStack Router #6455. Root shell must render without server data. Validated in Wave 2 deploy.
- **Column deletion**: Block deletion if column has issues (RESTRICT FK).
- **Labels**: Simple `text[]` on issues table, chip input with autocomplete from existing project tags. No separate labels table.
- **Default columns**: Auto-create "To Do", "In Progress", "Done" on new board creation.
- **Ownership**: Board creator = owner. No transfer in v1.
- **RLS silent failures**: SELECT/UPDATE/DELETE return 0 rows on policy violation (no error). UI must handle empty results.

### Infrastructure (LIVE)
- **Supabase project**: Toad
- **Region**: Central EU (Frankfurt) — eu-central-1
- **URL**: `https://wdnzqeilwqjuyjeaxjbs.supabase.co`
- **Data API**: Enabled
- **Auto RLS**: Disabled (manual per-table setup)

### Data Model

**profiles**
- `id` uuid PK (FK → auth.users.id)
- `email` text NOT NULL
- `created_at` timestamptz DEFAULT now()

**projects**
- `id` uuid PK DEFAULT gen_random_uuid()
- `name` text NOT NULL
- `owner_id` uuid FK → profiles.id
- `created_at` timestamptz DEFAULT now()

**project_members**
- `id` uuid PK DEFAULT gen_random_uuid()
- `project_id` uuid FK → projects.id ON DELETE CASCADE
- `user_id` uuid FK → profiles.id (NULLABLE)
- `invited_email` text NOT NULL
- `role` text DEFAULT 'member' CHECK (role IN ('owner', 'member'))
- `created_at` timestamptz DEFAULT now()
- UNIQUE(project_id, invited_email)
- CHECK(user_id IS NOT NULL OR invited_email IS NOT NULL)

**columns**
- `id` uuid PK DEFAULT gen_random_uuid()
- `project_id` uuid FK → projects.id ON DELETE CASCADE
- `name` text NOT NULL
- `position` integer NOT NULL
- `created_at` timestamptz DEFAULT now()

**issues**
- `id` uuid PK DEFAULT gen_random_uuid()
- `project_id` uuid FK → projects.id ON DELETE CASCADE (denormalized for RLS)
- `column_id` uuid FK → columns.id ON DELETE RESTRICT
- `title` text NOT NULL
- `description` text DEFAULT ''
- `priority` text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'))
- `labels` text[] DEFAULT '{}'
- `assignee_email` text (nullable)
- `due_date` date (nullable)
- `position` integer NOT NULL
- `created_at` timestamptz DEFAULT now()
- `updated_at` timestamptz DEFAULT now()

**Database Triggers**:
1. `handle_new_user()` — On auth.users INSERT → insert into profiles(id, email)
2. `claim_pending_invites()` — On auth.users INSERT → UPDATE project_members SET user_id = NEW.id WHERE invited_email = NEW.email AND user_id IS NULL

**Private Schema Helper**:
- `private.is_project_member(project_id uuid)` — SECURITY DEFINER function checking project_members for current auth.uid()

## ✅ Manual Setup (YOU do this before `/start-work`)

These are steps that require your Supabase dashboard access. The agents can't do these.

### 1. Get Supabase Credentials
Go to [Supabase Dashboard → Toad → Settings → API](https://supabase.com/dashboard/project/wdnzqeilwqjuyjeaxjbs/settings/api)

Copy these two values:
- **Project URL**: `https://wdnzqeilwqjuyjeaxjbs.supabase.co` (you already have this)
- **Publishable key**: (under "Connect" → "API Keys" or the TanStack Start connect template — starts with `sb_publishable_`)

Create a `.env` file in the project root:
```
VITE_SUPABASE_URL=https://wdnzqeilwqjuyjeaxjbs.supabase.co
VITE_SUPABASE_KEY=<paste your publishable key here>
```

### 2. Enable Email Auth Provider
Go to [Supabase Dashboard → Toad → Authentication → Providers](https://supabase.com/dashboard/project/wdnzqeilwqjuyjeaxjbs/auth/providers)

- **Email** provider should be enabled by default
- Make sure "Confirm email" is **DISABLED** (so signups auto-confirm for simplicity)
  - Go to Authentication → Settings → uncheck "Enable email confirmations"

### 3. Apply the Migration SQL (Task 7 will guide, but you may need to paste)
After Task 2 generates the SQL file, it needs to run against your Supabase database.
The agent (Task 7) will attempt to do this, but if it can't access the dashboard:

- Go to [SQL Editor](https://supabase.com/dashboard/project/wdnzqeilwqjuyjeaxjbs/sql/new)
- Paste the contents of `supabase/migrations/001_initial_schema.sql`
- Click "Run"
- Verify: go to Table Editor and confirm all 5 tables exist

### 4. Vercel Setup (when Task 4 runs)
- Create a Vercel project linked to this repo (or the agent will use `npx vercel`)
- Set env vars in Vercel dashboard: `VITE_SUPABASE_URL` + `VITE_SUPABASE_KEY`
- Framework preset: **Other** (not auto-detect)

---

## Work Objectives

### Core Objective
Build and deploy a multi-board kanban issue tracker with email auth, drag-and-drop columns, and themed UI — optimized for fast issue capture from any device.

### Concrete Deliverables
- Live Vercel deployment URL
- Auth system (signup, login, logout)
- Dashboard showing all boards
- Board view with customizable columns and draggable issue cards
- Issue detail side panel with all fields
- Quick-add (inline + floating button)
- Filter bar (assignee, priority, label, search)
- Settings pages (board settings, theme picker)
- Responsive mobile layout

### Definition of Done
- [ ] App loads at Vercel URL without errors
- [ ] Can sign up, log in, log out
- [ ] Can create boards, see them on dashboard
- [ ] Can create/rename/reorder/delete columns
- [ ] Can create/edit/delete issues with all fields
- [ ] Can drag issues between columns
- [ ] Side panel opens on issue click
- [ ] Quick-add works (inline + FAB)
- [ ] Filters work (assignee, priority, label, search)
- [ ] Theme picker changes app theme
- [ ] Dark/light toggle works
- [ ] Adding an email to a project → that user sees the project after signup
- [ ] Mobile-responsive layout works on phone viewport

### Must Have
- RLS on ALL Supabase tables (no exceptions)
- `(select auth.uid())` wrapper in all RLS policies (performance)
- Indexes on all FK columns used in RLS policies
- Column deletion blocked when column has issues
- Default columns created on new board ("To Do", "In Progress", "Done")
- `onDragOver` for state updates (not `onDragEnd`) to avoid removeChild error
- `touch-action: none` or delay constraint on draggable elements for mobile
- `/_shell.html` as Vercel rewrite destination
- `VITE_` prefix on all client-side env vars

### Must NOT Have (Guardrails)
- No Google/OAuth login flows
- No `@dnd-kit/core` legacy API (use `@dnd-kit/react` only)
- No ORM layer (no Drizzle, no Prisma — Supabase JS client only)
- No comments, attachments, notifications, activity log, or time tracking
- No realtime subscriptions
- No `as any` or `@ts-ignore` type escapes
- No raw SQL from client — all queries through Supabase JS client
- No `raw_user_meta_data` for authorization decisions
- No service_role key in client-side code

---

## Verification Strategy

> **QA DEFERRED** — This plan is implementation-only. No Playwright scenarios, no agent QA, no evidence capture.
> QA scenarios in task descriptions are INFORMATIONAL ONLY — agents should NOT execute them.
> Verification is limited to: `npm run build` succeeds + `tsc --noEmit` passes + visual spot-check by user.

### Test Decision
- **Automated tests**: NONE for v1
- **Playwright QA**: DEFERRED (not executed during implementation)
- **Primary verification**: Build succeeds, TypeScript compiles, app runs on dev server

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 2 parallel):
├── Task 1: Project scaffold + SPA config [quick]
└── Task 2: Supabase migration SQL [deep]

Wave 2 (Platform Setup — 5 parallel):
├── Task 3: Supabase client module + types (depends: 1, 2) [quick]
├── Task 4: Vercel deployment + first deploy (depends: 1) [quick]
├── Task 5: Theme system + dark/light toggle (depends: 1) [quick]
├── Task 6: App shell layout + route structure (depends: 1) [deep]
└── Task 7: Apply Supabase migration + RLS verify (depends: 2) [quick]

Wave 3 (Auth + Utilities — 2 parallel):
├── Task 8: Auth system (depends: 3, 7) [deep]
└── Task 9: Avatar utility (depends: 1) [quick]

Wave 4 (Board Management — 4 parallel):
├── Task 10: Dashboard home + board list (depends: 6, 8, 9) [deep]
├── Task 11: Board view + column CRUD (depends: 6, 8) [deep]
├── Task 12: Board settings + member management (depends: 8) [deep]
└── Task 13: Theme picker settings page (depends: 5, 6, 8) [quick]

Wave 5 (Issue Data — 1 task):
└── Task 14: Issue CRUD + card rendering (depends: 11) [deep]

Wave 6 (Issue Interactions — 4 parallel):
├── Task 15: Issue side panel (depends: 14) [deep]
├── Task 16: Quick-add inline + FAB (depends: 14) [deep]
├── Task 17: Drag-and-drop kanban (depends: 14, 11) [deep]
└── Task 18: Filter bar (depends: 14) [deep]

Wave 7 (Polish — 2 parallel):
├── Task 19: Mobile responsive + touch DnD tuning (depends: 17, 15, 16) [deep]
└── Task 20: Final Vercel deploy + smoke test (depends: all) [quick]

Wave FINAL (Verification — 3 parallel):
├── F1: Build + type check [quick]
├── F2: Code quality scan [deep]
└── F3: Scope fidelity check [deep]

Critical Path: T1 → T3 → T8 → T11 → T14 → T17 → T19 → T20 → FINAL
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 3, 4, 5, 6, 7, 9 | 1 |
| 2 | — | 3, 7 | 1 |
| 3 | 1, 2 | 8 | 2 |
| 4 | 1 | 20 | 2 |
| 5 | 1 | 13 | 2 |
| 6 | 1 | 10, 11, 13 | 2 |
| 7 | 2 | 8 | 2 |
| 8 | 3, 7 | 10, 11, 12, 13 | 3 |
| 9 | 1 | 10 | 3 |
| 10 | 6, 8, 9 | 19 | 4 |
| 11 | 6, 8 | 14, 17 | 4 |
| 12 | 8 | 19 | 4 |
| 13 | 5, 6, 8 | 19 | 4 |
| 14 | 11 | 15, 16, 17, 18 | 5 |
| 15 | 14 | 19 | 6 |
| 16 | 14 | 19 | 6 |
| 17 | 14, 11 | 19 | 6 |
| 18 | 14 | 19 | 6 |
| 19 | 17, 15, 16 | 20 | 7 |
| 20 | all | F1–F3 | 7 |

### Agent Dispatch Summary

| Wave | Tasks | Categories |
|------|-------|-----------|
| 1 | 2 | T1 → `visual-engineering`, T2 → `visual-engineering` |
| 2 | 5 | T3 → `visual-engineering`, T4 → `visual-engineering`, T5 → `visual-engineering`, T6 → `visual-engineering`, T7 → `visual-engineering` |
| 3 | 2 | T8 → `visual-engineering`, T9 → `visual-engineering` |
| 4 | 4 | T10 → `visual-engineering`, T11 → `visual-engineering`, T12 → `visual-engineering`, T13 → `visual-engineering` |
| 5 | 1 | T14 → `visual-engineering` |
| 6 | 4 | T15 → `visual-engineering`, T16 → `visual-engineering`, T17 → `visual-engineering`, T18 → `visual-engineering` |
| 7 | 2 | T19 → `visual-engineering`, T20 → `visual-engineering` |
| FINAL | 3 | F1 → `visual-engineering`, F2 → `visual-engineering`, F3 → `visual-engineering` |

---

## TODOs

> Implementation tasks below. EVERY task has: Agent Profile + Parallelization + References.
> QA Scenarios in tasks are **informational only** — agents should NOT execute them during this run.
> Focus: build it, make it compile, make it work.

### Wave 1: Foundation

- [ ] 1. Project Scaffold + SPA Config

  **What to do**:
  - Run `npx shadcn@latest init -t tanstack` to scaffold the full TanStack Start project with shadcn, Tailwind CSS v4, and path aliases
  - Configure SPA mode in `vite.config.ts`: add `spa: { enabled: true }` to the tanstackStart plugin options
  - Verify the project builds with `npm run build` and starts with `npm run dev`
  - Add `.env` and `.env.example` with placeholder Supabase vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`
  - Add basic `vercel.json` with the SPA rewrite rule: `{ "rewrites": [{ "source": "/(.*)", "destination": "/_shell.html" }] }`
  - Ensure `__root.tsx` renders a clean shell without any server-data dependencies

  **Must NOT do**:
  - Do NOT manually set up Vite or TanStack Start — let `shadcn init -t tanstack` handle it
  - Do NOT install `@dnd-kit/core` (legacy) — that comes in a later task with `@dnd-kit/react`
  - Do NOT add Supabase client code yet (Task 3)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`]
    - `react-doctor`: Verify scaffold output is clean React, catch any config issues early

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 3, 4, 5, 6, 7, 9
  - **Blocked By**: None

  **References**:
  - **External**: [TanStack Start SPA mode docs](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode) — `spa: { enabled: true }` config in vite.config.ts
  - **External**: [shadcn TanStack Start init](https://ui.shadcn.com/docs/installation/tanstack) — the `init -t tanstack` command scaffolds the full project
  - **Pattern note**: SPA shell prerenders to `/_shell.html` — Vercel rewrite MUST target this path, not `/`
  - **Pattern note**: `__root.tsx` is the static shell entry point in SPA mode — must render without route-specific data or server loaders

  **Acceptance Criteria**:
  - [ ] `npm run build` succeeds with zero errors
  - [ ] `npm run dev` serves the app at localhost
  - [ ] `vite.config.ts` contains `spa: { enabled: true }`
  - [ ] `.env.example` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`
  - [ ] `vercel.json` contains rewrite to `/_shell.html`

  **QA Scenarios:**
  ```
  Scenario: Dev server boots and renders shell
    Tool: Bash
    Preconditions: Project scaffolded, dependencies installed
    Steps:
      1. Run `npm run dev` in background
      2. Wait 5s for server startup
      3. `curl http://localhost:3000` — capture response
      4. Kill dev server
    Expected Result: HTML response contains a `<div id="root">` or similar React mount point, no error stack traces
    Failure Indicators: curl returns connection refused, or HTML contains error messages
    Evidence: .sisyphus/evidence/task-1-dev-server-boot.txt

  Scenario: Build succeeds in SPA mode
    Tool: Bash
    Preconditions: vite.config.ts has spa.enabled=true
    Steps:
      1. Run `npm run build`
      2. Check exit code is 0
      3. Verify `.output/public/_shell.html` exists (or equivalent build output)
    Expected Result: Build exits 0, shell HTML file exists in output
    Failure Indicators: Build errors, missing _shell.html
    Evidence: .sisyphus/evidence/task-1-spa-build.txt
  ```

  **Commit**: YES
  - Message: `chore: scaffold tanstack start + shadcn + SPA config`
  - Files: All scaffolded files

- [ ] 2. Supabase Migration SQL

  **What to do**:
  - Create `supabase/migrations/001_initial_schema.sql` containing ALL tables, indexes, triggers, private schema, RLS policies, and helper functions
  - Tables: `profiles`, `projects`, `project_members`, `columns`, `issues` (exact schemas defined in Context > Data Model section above)
  - Create `private` schema: `CREATE SCHEMA IF NOT EXISTS private`
  - Create `private.is_project_member(p_project_id uuid)` — SECURITY DEFINER function with `SET search_path = ''`
  - Create trigger `handle_new_user()` on `auth.users` INSERT → inserts into profiles(id, email)
  - Create trigger `claim_pending_invites()` on `auth.users` INSERT → matches email to pending project_members rows, sets user_id
  - Enable RLS on ALL public tables: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY`
  - Create RLS policies for each table:
    - `profiles`: SELECT own row, UPDATE own row. All policies use `TO authenticated`
    - `projects`: SELECT/UPDATE/DELETE where `private.is_project_member(id)`, INSERT for any authenticated
    - `project_members`: SELECT where `private.is_project_member(project_id)`, INSERT/DELETE where user is owner
    - `columns`: SELECT/INSERT/UPDATE/DELETE where `private.is_project_member(project_id)`
    - `issues`: SELECT/INSERT/UPDATE/DELETE where `private.is_project_member(project_id)`
  - ALL policies must use `(select auth.uid())` wrapper — NOT bare `auth.uid()` (performance: 179ms → 9ms)
  - Create indexes for RLS performance:
    - `ix_project_members_user_id ON project_members(user_id)`
    - `ix_project_members_project_id ON project_members(project_id)`
    - `ix_columns_project_id ON columns(project_id)`
    - `ix_issues_project_id ON issues(project_id)`
    - `ix_issues_column_id ON issues(column_id)`
  - Create `updated_at` trigger for issues table (auto-set on UPDATE)

  **Must NOT do**:
  - Do NOT apply the migration yet (that's Task 7)
  - Do NOT use `raw_user_meta_data` for any authorization
  - Do NOT create RLS policies for `anon` role — all policies use `TO authenticated`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
    - Pure SQL task, no framework skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 3, 7
  - **Blocked By**: None

  **References**:
  - **Data Model**: See Context > Data Model section in this plan for exact table schemas, column types, constraints
  - **External**: [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy syntax and best practices
  - **Pattern note**: All SECURITY DEFINER functions must include `SET search_path = ''` to prevent search_path injection
  - **Pattern note**: `project_members` has BOTH `user_id` (nullable uuid) and `invited_email` (text). The `claim_pending_invites` trigger bridges the gap on signup
  - **Pattern note**: `issues.project_id` is denormalized (also exists on columns) specifically to avoid 2-hop joins in RLS policy evaluation
  - **Pattern note**: Column deletion uses ON DELETE RESTRICT on `issues.column_id` FK — blocks deletion of non-empty columns

  **Acceptance Criteria**:
  - [ ] File `supabase/migrations/001_initial_schema.sql` exists
  - [ ] Contains CREATE TABLE for all 5 tables with correct columns and constraints
  - [ ] Contains CREATE SCHEMA private + is_project_member function
  - [ ] Contains both triggers (handle_new_user, claim_pending_invites)
  - [ ] All RLS policies use `(select auth.uid())` wrapper
  - [ ] All policies specify `TO authenticated`
  - [ ] All 5 RLS performance indexes present
  - [ ] SQL is syntactically valid (no obvious errors)

  **QA Scenarios:**
  ```
  Scenario: Migration SQL is syntactically valid
    Tool: Bash
    Preconditions: Migration file exists
    Steps:
      1. Read `supabase/migrations/001_initial_schema.sql`
      2. Verify it contains `CREATE TABLE profiles`, `CREATE TABLE projects`, `CREATE TABLE project_members`, `CREATE TABLE columns`, `CREATE TABLE issues`
      3. Verify it contains `CREATE SCHEMA IF NOT EXISTS private`
      4. Verify it contains `ENABLE ROW LEVEL SECURITY` for all 5 tables
      5. Grep for `auth.uid()` — every occurrence must be wrapped in `(select ...)`
      6. Grep for `TO authenticated` — every CREATE POLICY must include it
    Expected Result: All 5 tables, private schema, RLS enabled on all, auth.uid() always wrapped, TO authenticated on all policies
    Failure Indicators: Missing tables, bare auth.uid() calls, missing TO authenticated
    Evidence: .sisyphus/evidence/task-2-migration-validation.txt
  ```

  **Commit**: YES (groups with T1 if same wave)
  - Message: `chore: add supabase migration SQL`
  - Files: `supabase/migrations/001_initial_schema.sql`

### Wave 2: Platform Setup

- [ ] 3. Supabase Client Module + Types

  **What to do**:
  - Install `@supabase/supabase-js`
  - Create `src/lib/supabase.ts` — initialize Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` from `import.meta.env`
  - Generate TypeScript types from Supabase schema: create `src/lib/database.types.ts` with typed table definitions matching the migration schema
    - Use the Supabase CLI `npx supabase gen types typescript` if the migration has been applied, OR manually write the types matching the migration SQL
  - Export typed helper: `const supabase = createClient<Database>(url, key)`
  - Create `src/lib/queries/` directory structure for organized query files (empty for now, used by later tasks)

  **Must NOT do**:
  - Do NOT add Drizzle, Prisma, or any ORM
  - Do NOT put `SUPABASE_SERVICE_ROLE_KEY` anywhere in client code
  - Do NOT create actual query functions yet (those come in feature tasks)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 6, 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2

  **References**:
  - **Data Model**: Context > Data Model section — type definitions must match these exactly
  - **External**: [Supabase JS client docs](https://supabase.com/docs/reference/javascript/initializing) — `createClient<Database>()` typed initialization
  - **Pattern note**: Use `import.meta.env.VITE_SUPABASE_URL` (not `process.env`) — SPA mode requires VITE_ prefix

  **Acceptance Criteria**:
  - [ ] `@supabase/supabase-js` in package.json dependencies
  - [ ] `src/lib/supabase.ts` exports typed `supabase` client
  - [ ] `src/lib/database.types.ts` has types for all 5 tables
  - [ ] No service_role key references anywhere in src/

  **QA Scenarios:**
  ```
  Scenario: Supabase client module imports without error
    Tool: Bash
    Preconditions: Dependencies installed, env vars placeholder in .env
    Steps:
      1. Run `npx tsc --noEmit`
      2. Check that src/lib/supabase.ts compiles without type errors
      3. Grep src/ for `service_role` or `SERVICE_ROLE` — must find 0 results
    Expected Result: tsc passes, no service role key in client code
    Failure Indicators: Type errors, service_role key found
    Evidence: .sisyphus/evidence/task-3-supabase-client.txt
  ```

  **Commit**: YES (groups with T4-T7)
  - Message: `feat: platform infrastructure (supabase client, vercel, theme, layout)`
  - Files: `src/lib/supabase.ts`, `src/lib/database.types.ts`

- [ ] 4. Vercel Deployment + First Deploy

  **What to do**:
  - Ensure `vercel.json` from Task 1 is correct (rewrite to `/_shell.html`)
  - Create Vercel project linked to this repo (or deploy with `npx vercel`)
  - Set environment variables in Vercel dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (use actual values from Supabase Toad project)
  - Deploy and verify:
    - Root URL loads the app shell
    - Direct navigation to a sub-route (e.g., `/login`) loads correctly (doesn't 404)
    - No hydration errors in browser console
  - Set Vercel framework preset to "Other" (not auto-detect)

  **Must NOT do**:
  - Do NOT set up custom domains (Vercel auto-generated URL is fine)
  - Do NOT add preview deployment config (keep simple)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`playwright`]
    - `playwright`: Needed to open deployed URL and verify no console errors, check direct navigation

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 5, 6, 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 20
  - **Blocked By**: Task 1

  **References**:
  - **Pattern reference**: Task 1's `vercel.json` — verify rewrite destination is `/_shell.html`
  - **External**: [TanStack Start deployment](https://tanstack.com/start/latest/docs/framework/react/hosting) — Vercel target config
  - **Risk**: TanStack Router #6455 — direct navigation to non-root routes may cause hydration error. Test by navigating directly to `/login`. If broken, check `__root.tsx` renders without server data.

  **Acceptance Criteria**:
  - [ ] Vercel deployment succeeds (build + deploy)
  - [ ] Root URL loads app shell
  - [ ] Direct navigation to `/login` works (no 404, no hydration error)
  - [ ] Browser console shows no React errors

  **QA Scenarios:**
  ```
  Scenario: Deployed app loads and handles direct navigation
    Tool: Playwright
    Preconditions: Vercel deployment completed, URL available
    Steps:
      1. Navigate to Vercel URL root (e.g., `https://toad-xxx.vercel.app/`)
      2. Assert page loads (no error overlay, document.title is set)
      3. Navigate directly to `https://toad-xxx.vercel.app/login`
      4. Assert page loads without 404 or hydration error
      5. Check browser console for React error messages — should be empty
    Expected Result: Both root and direct sub-route navigation load cleanly
    Failure Indicators: 404 on sub-route, React hydration error in console, blank page
    Evidence: .sisyphus/evidence/task-4-vercel-deploy.png
  ```

  **Commit**: YES (groups with T3, T5-T7)
  - Message: grouped with Wave 2
  - Files: `vercel.json` (if updated)


- [ ] 5. Theme System + Dark/Light Toggle

  **What to do**:
  - Pick ~10-15 tweakcn preset themes from [tweakcn.com/editor/theme](https://tweakcn.com/editor/theme). Good candidates: Modern Minimal, Catppuccin, Claude, Vercel, Graphite, Violet Bloom, Neo Brutalism, T3 Chat, Darkmatter, Mono, Supabase
  - For each theme, copy the generated CSS variables (both light and dark variants) into separate CSS files or a single themes config file
  - Create `src/lib/themes.ts` exporting a theme registry: `{ id, name, cssVars }[]`
  - Create `src/components/theme-provider.tsx`:
    - Wraps app in a context that manages current theme + light/dark mode
    - Reads saved preference from `localStorage` on mount
    - Applies theme by setting CSS variables on `document.documentElement`
    - Applies dark mode via `class="dark"` on `<html>` element
  - Create `src/components/theme-toggle.tsx` — simple dark/light toggle button using shadcn Switch or Button
  - Wire ThemeProvider into `__root.tsx`

  **Must NOT do**:
  - Do NOT install `next-themes` — implement the toggle manually (simpler, no Next.js dependency)
  - Do NOT build the theme picker settings page (that's Task 13)
  - Keep to just the provider + toggle + theme data

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Understands CSS variable theming patterns and shadcn conventions

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4, 6, 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13
  - **Blocked By**: Task 1

  **References**:
  - **External**: [tweakcn.com/editor/theme](https://tweakcn.com/editor/theme) — visual theme editor, pick presets and copy CSS output
  - **Pattern note**: tweakcn outputs CSS variables scoped to `:root` (light) and `.dark` (dark). The class-based toggle sets `class="dark"` on `<html>`
  - **Pattern note**: shadcn components automatically use CSS variables like `--background`, `--foreground`, `--primary`, etc. Swapping variables re-skins everything
  - **Pattern note**: Persist theme choice in `localStorage` with keys like `toad-theme` and `toad-color-mode`

  **Acceptance Criteria**:
  - [ ] `src/lib/themes.ts` exports array of 10-15 theme objects
  - [ ] `src/components/theme-provider.tsx` provides theme context
  - [ ] `src/components/theme-toggle.tsx` renders a dark/light toggle
  - [ ] Dark mode toggles correctly (class on html + CSS vars change)
  - [ ] Theme persists across page refresh via localStorage

  **QA Scenarios:**
  ```
  Scenario: Dark/light toggle works
    Tool: Playwright
    Preconditions: App running on dev server with theme provider wired in
    Steps:
      1. Navigate to `http://localhost:3000`
      2. Check `document.documentElement.classList` — note current mode
      3. Click the theme toggle button (selector: `button[aria-label*="theme"]` or similar)
      4. Assert `document.documentElement.classList.contains('dark')` changed
      5. Refresh page
      6. Assert dark mode class persisted
    Expected Result: Toggle flips dark class, persists after refresh
    Failure Indicators: Class doesn't toggle, resets on refresh
    Evidence: .sisyphus/evidence/task-5-theme-toggle.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: grouped with Wave 2 commit
  - Files: `src/lib/themes.ts`, `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`, `src/styles/themes/`

- [ ] 6. App Shell Layout + Route Structure

  **What to do**:
  - Define the route structure using TanStack Router file-based routing:
    - `src/routes/__root.tsx` — root shell (already from scaffold), add ThemeProvider wrapper
    - `src/routes/index.tsx` — redirect to `/dashboard` if logged in, `/login` if not
    - `src/routes/login.tsx` — placeholder login page
    - `src/routes/signup.tsx` — placeholder signup page
    - `src/routes/dashboard.tsx` — placeholder dashboard (boards list)
    - `src/routes/board/$boardId.tsx` — placeholder board view
    - `src/routes/settings.tsx` — placeholder settings page (or `settings/` directory with sub-routes)
  - Create `src/components/layout/` directory:
    - `sidebar.tsx` — sidebar component skeleton (board list, quick-switch). Visible only inside board view. Use shadcn Sidebar component as base.
    - `header.tsx` — top header with app name, theme toggle, user avatar, logout button
  - All routes are placeholder shells with the correct layout wrapping — actual content comes in later tasks
  - Board route uses a layout with sidebar; dashboard/auth routes do not

  **Must NOT do**:
  - Do NOT implement auth logic or route protection (Task 8)
  - Do NOT fetch any data — just render static placeholder UI
  - Do NOT build actual board/dashboard content (Tasks 10, 11)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`, `frontend-ui-ux`]
    - `react-doctor`: Validate route structure, catch React issues in layout composition
    - `frontend-ui-ux`: Layout patterns, sidebar/header design

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4, 5, 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 10, 11, 13
  - **Blocked By**: Task 1

  **References**:
  - **External**: [TanStack Router file-based routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing) — `routes/` directory conventions, `$param` for dynamic segments
  - **External**: [shadcn Sidebar component](https://ui.shadcn.com/docs/components/sidebar) — collapsible sidebar with mobile support
  - **Pattern note**: Board view uses `board/$boardId.tsx` with `$boardId` as the dynamic param. Access via `useParams({ from: '/board/$boardId' })`
  - **Pattern note**: `__root.tsx` wraps everything — add ThemeProvider here so all routes inherit it

  **Acceptance Criteria**:
  - [ ] All route files exist in `src/routes/`
  - [ ] Root layout wraps children in ThemeProvider
  - [ ] Board route uses sidebar layout, auth routes do not
  - [ ] Navigation between routes works without page reload
  - [ ] `npm run build` succeeds with all routes

  **QA Scenarios:**
  ```
  Scenario: Route structure and navigation
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to `http://localhost:3000/`
      2. Assert page loads (any content, no error)
      3. Navigate to `http://localhost:3000/login`
      4. Assert login placeholder renders
      5. Navigate to `http://localhost:3000/dashboard`
      6. Assert dashboard placeholder renders
      7. Navigate to `http://localhost:3000/board/test-id`
      8. Assert board placeholder renders with sidebar visible
    Expected Result: All routes render their placeholder content without errors
    Failure Indicators: 404 on any route, React error overlay, blank page
    Evidence: .sisyphus/evidence/task-6-route-structure.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: grouped with Wave 2 commit
  - Files: `src/routes/**`, `src/components/layout/`

- [ ] 7. Apply Supabase Migration + RLS Verification

  **What to do**:
  - Apply the migration SQL from Task 2 to the live Supabase Toad project
    - Option A: Use Supabase Dashboard SQL editor — paste and run
    - Option B: Use Supabase CLI: `npx supabase db push` (if linked)
  - Verify all tables exist: `profiles`, `projects`, `project_members`, `columns`, `issues`
  - Verify RLS is enabled on all 5 tables
  - Verify the `private` schema exists with `is_project_member` function
  - Test RLS by making an unauthenticated API call:
    - `curl` the Supabase REST API with just the publishable key (no auth header) — should return empty arrays for all tables
  - Run the RLS health check query to confirm no tables without RLS:
    ```sql
    SELECT tablename FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public' AND c.relrowsecurity = false;
    ```
    Expected result: empty (all public tables have RLS)

  **Must NOT do**:
  - Do NOT modify the migration SQL (if changes needed, update Task 2's file first)
  - Do NOT create test data yet

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4, 5, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: Task 2

  **References**:
  - **File reference**: `supabase/migrations/001_initial_schema.sql` (from Task 2) — the SQL to apply
  - **External**: [Supabase SQL Editor](https://supabase.com/dashboard/project/wdnzqeilwqjuyjeaxjbs/sql/new) — paste migration SQL here
  - **Pattern note**: Supabase REST API URL for testing: `https://wdnzqeilwqjuyjeaxjbs.supabase.co/rest/v1/{table}?select=*` with header `apikey: {publishable_key}`

  **Acceptance Criteria**:
  - [ ] All 5 tables exist in Supabase
  - [ ] RLS health check query returns 0 rows (all tables have RLS)
  - [ ] Unauthenticated API call returns empty results, not errors
  - [ ] `private.is_project_member` function exists

  **QA Scenarios:**
  ```
  Scenario: RLS blocks unauthenticated access
    Tool: Bash (curl)
    Preconditions: Migration applied to Supabase Toad project
    Steps:
      1. curl -s "https://wdnzqeilwqjuyjeaxjbs.supabase.co/rest/v1/projects?select=*" -H "apikey: $VITE_SUPABASE_KEY" -H "Authorization: Bearer $VITE_SUPABASE_KEY"
      2. Assert response is `[]` (empty array, not error)
      3. curl -s "https://wdnzqeilwqjuyjeaxjbs.supabase.co/rest/v1/issues?select=*" -H "apikey: $VITE_SUPABASE_KEY" -H "Authorization: Bearer $VITE_SUPABASE_KEY"
      4. Assert response is `[]`
    Expected Result: Empty arrays for all tables (RLS blocks non-authenticated reads)
    Failure Indicators: Error responses, or actual data returned, or 401/403 (publishable key should be allowed but return 0 rows due to RLS)
    Evidence: .sisyphus/evidence/task-7-rls-verification.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: grouped with Wave 2 commit
  - Files: N/A (database state change only)


### Wave 3: Auth + Utilities

- [ ] 8. Auth System (Signup, Login, Logout, Session, Route Protection)

  **What to do**:
  - Create `src/lib/auth.ts` — auth helper functions wrapping Supabase Auth:
    - `signUp(email, password)` → `supabase.auth.signUp({ email, password })`
    - `signIn(email, password)` → `supabase.auth.signInWithPassword({ email, password })`
    - `signOut()` → `supabase.auth.signOut()`
    - `getSession()` → `supabase.auth.getSession()`
    - `getUser()` → `supabase.auth.getUser()`
  - Create `src/hooks/use-auth.ts` — React hook providing current user, loading state, and auth methods. Uses `supabase.auth.onAuthStateChange` for reactive updates.
  - Build `src/routes/login.tsx`:
    - Email + password form using shadcn Input, Button, Card components
    - Show validation errors (empty fields, wrong credentials)
    - "Don't have an account? Sign up" link
    - On success: redirect to `/dashboard`
  - Build `src/routes/signup.tsx`:
    - Email + password + confirm password form
    - Show validation errors (passwords don't match, email taken)
    - "Already have an account? Log in" link
    - On success: redirect to `/dashboard` (Supabase auto-confirms on free tier)
  - Create route protection wrapper/HOC:
    - Check auth state before rendering protected routes (dashboard, board, settings)
    - Redirect to `/login` if not authenticated
    - Redirect to `/dashboard` if authenticated user visits `/login` or `/signup`
  - Add logout button to header component (from Task 6)
  - Wire `useAuth` hook into layout to show user email in header

  **Must NOT do**:
  - Do NOT implement Google/OAuth login
  - Do NOT use `raw_user_meta_data` for anything
  - Do NOT create a separate "confirm email" flow (Supabase free tier auto-confirms)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`]
    - `react-doctor`: Validate auth flow, catch React state issues with auth context

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 9)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 10, 11, 12, 13
  - **Blocked By**: Tasks 3, 7

  **References**:
  - **External**: [Supabase Auth JS reference](https://supabase.com/docs/reference/javascript/auth-signup) — signUp, signInWithPassword, signOut, onAuthStateChange API
  - **File reference**: `src/lib/supabase.ts` (from Task 3) — import the typed Supabase client from here
  - **File reference**: `src/routes/login.tsx`, `src/routes/signup.tsx` (placeholders from Task 6) — replace placeholder content
  - **File reference**: `src/components/layout/header.tsx` (from Task 6) — add logout button and user email display
  - **Pattern note**: Use `supabase.auth.onAuthStateChange((event, session) => ...)` for reactive auth — handles token refresh automatically
  - **Pattern note**: Route protection pattern: check session in route loader or use a wrapper component that redirects
  - **External**: shadcn components to use: [Card](https://ui.shadcn.com/docs/components/card), [Input](https://ui.shadcn.com/docs/components/input), [Button](https://ui.shadcn.com/docs/components/button), [Label](https://ui.shadcn.com/docs/components/label)

  **Acceptance Criteria**:
  - [ ] Signup form at `/signup` creates a new user in Supabase
  - [ ] Login form at `/login` authenticates and redirects to `/dashboard`
  - [ ] Logout button signs out and redirects to `/login`
  - [ ] Protected routes redirect to `/login` when not authenticated
  - [ ] `/login` redirects to `/dashboard` when already authenticated
  - [ ] Auth state persists across page refresh (Supabase handles via localStorage)

  **QA Scenarios:**
  ```
  Scenario: Full auth flow — signup, logout, login
    Tool: Playwright
    Preconditions: Dev server running, Supabase Toad project live with migration applied
    Steps:
      1. Navigate to `http://localhost:3000/signup`
      2. Fill email: `testuser@example.com`, password: `TestPass123!`, confirm: `TestPass123!`
      3. Click signup button
      4. Assert redirect to `/dashboard`
      5. Assert header shows `testuser@example.com` (or first letter avatar)
      6. Click logout button in header
      7. Assert redirect to `/login`
      8. Fill email: `testuser@example.com`, password: `TestPass123!`
      9. Click login button
      10. Assert redirect to `/dashboard`
    Expected Result: Full signup → logout → login cycle works
    Failure Indicators: Signup fails, no redirect, auth state not preserved
    Evidence: .sisyphus/evidence/task-8-auth-flow.png

  Scenario: Route protection blocks unauthenticated access
    Tool: Playwright
    Preconditions: No active session (cleared cookies/localStorage)
    Steps:
      1. Navigate directly to `http://localhost:3000/dashboard`
      2. Assert redirect to `/login`
      3. Navigate directly to `http://localhost:3000/board/some-id`
      4. Assert redirect to `/login`
    Expected Result: Protected routes redirect to login
    Failure Indicators: Dashboard or board renders without auth
    Evidence: .sisyphus/evidence/task-8-route-protection.png
  ```

  **Commit**: YES
  - Message: `feat: auth system + avatar utility`
  - Files: `src/lib/auth.ts`, `src/hooks/use-auth.ts`, `src/routes/login.tsx`, `src/routes/signup.tsx`, `src/components/layout/header.tsx`

- [ ] 9. Avatar Utility

  **What to do**:
  - Create `src/lib/avatar.ts` with two exports:
    - `getAvatarLetter(email: string): string` — returns first character of email, uppercased
    - `getAvatarColor(email: string): string` — hashes email string to an index, picks from a predefined array of ~12 distinct, accessible colors (good contrast in both light/dark mode)
  - Create `src/components/avatar.tsx` — simple component that renders a colored circle with the letter, using the utility functions. Accepts `email` prop and optional `size` prop.
  - Color array should include: warm red, orange, amber, green, teal, cyan, blue, indigo, violet, pink, rose, slate (or similar distinct palette)
  - Hash function: simple char code sum mod array length (deterministic, same email = same color always)

  **Must NOT do**:
  - Do NOT use Gravatar or any external avatar service
  - Do NOT add image upload capability

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 8)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 10
  - **Blocked By**: Task 1

  **References**:
  - **Pattern note**: Hash function example: `email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length`
  - **Pattern note**: Colors must be Tailwind-compatible classes or CSS values that work in both light and dark mode

  **Acceptance Criteria**:
  - [ ] `getAvatarLetter('hello@example.com')` returns `'H'`
  - [ ] `getAvatarColor` returns same color for same email, different colors for different emails
  - [ ] Avatar component renders a colored circle with letter

  **QA Scenarios:**
  ```
  Scenario: Avatar utility produces deterministic output
    Tool: Bash
    Preconditions: src/lib/avatar.ts exists
    Steps:
      1. Run `npx tsc --noEmit` — verify no type errors
      2. Create a quick test script that imports and calls getAvatarLetter('test@example.com') and getAvatarColor('test@example.com'), run twice, compare output
    Expected Result: Same input = same output both times. Letter is 'T'.
    Failure Indicators: Type errors, non-deterministic output
    Evidence: .sisyphus/evidence/task-9-avatar-utility.txt
  ```

  **Commit**: YES (groups with T8)
  - Message: grouped with auth commit
  - Files: `src/lib/avatar.ts`, `src/components/avatar.tsx`

### Wave 4: Board Management

- [ ] 10. Dashboard Home + Board List

  **What to do**:
  - Implement `src/routes/dashboard.tsx` — the main landing page after login:
    - Fetch user's boards: query `projects` table where user is a member (via `project_members`)
    - Display boards as cards in a responsive grid
    - Each board card shows: board name, member count, created date
    - "Create Board" button/card that opens a dialog
  - Create `src/components/board-card.tsx` — card component for each board, with member avatars
  - Create `src/components/create-board-dialog.tsx`:
    - shadcn Dialog with form: board name input
    - On submit: INSERT into `projects` table (name, owner_id = current user)
    - Auto-create `project_members` row (owner role) for the creator
    - Auto-create 3 default columns: "To Do" (pos 0), "In Progress" (pos 1), "Done" (pos 2)
    - Close dialog, refresh board list
  - Create `src/lib/queries/projects.ts` — query functions:
    - `getUserProjects()` — fetch projects where current user is a member
    - `createProject(name)` — insert project + owner membership + default columns
  - Empty state: if no boards, show a friendly message with a prominent "Create your first board" button
  - Board cards are clickable — navigate to `/board/{boardId}`

  **Must NOT do**:
  - Do NOT implement board deletion here (that's in Task 12 board settings)
  - Do NOT fetch board issues/columns on the dashboard (that's for the board view)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`, `frontend-ui-ux`]
    - `react-doctor`: Validate data fetching patterns, React state
    - `frontend-ui-ux`: Dashboard layout, card grid, empty states

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 11, 12, 13)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 19
  - **Blocked By**: Tasks 6, 8, 9

  **References**:
  - **File reference**: `src/routes/dashboard.tsx` (placeholder from Task 6) — replace with real content
  - **File reference**: `src/lib/supabase.ts` (from Task 3) — use typed Supabase client for queries
  - **File reference**: `src/components/avatar.tsx` (from Task 9) — render member avatars on board cards
  - **File reference**: `src/lib/database.types.ts` (from Task 3) — use typed query results
  - **Data Model reference**: `projects` and `project_members` tables — JOIN to find user's projects
  - **External**: shadcn [Dialog](https://ui.shadcn.com/docs/components/dialog), [Card](https://ui.shadcn.com/docs/components/card), [Button](https://ui.shadcn.com/docs/components/button)
  - **Pattern note**: Default columns on board creation: INSERT 3 rows into `columns` table with positions 0, 1, 2
  - **Pattern note**: Query pattern: `supabase.from('project_members').select('project_id, projects(*)').eq('user_id', userId)` to fetch projects via membership

  **Acceptance Criteria**:
  - [ ] Dashboard shows list of boards the user is a member of
  - [ ] "Create Board" dialog creates a new board with 3 default columns
  - [ ] New board appears in the list after creation
  - [ ] Empty state shown when user has no boards
  - [ ] Board cards are clickable, navigate to `/board/{id}`

  **QA Scenarios:**
  ```
  Scenario: Create board and see it on dashboard
    Tool: Playwright
    Preconditions: Logged in user, no existing boards
    Steps:
      1. Navigate to `/dashboard`
      2. Assert empty state message is visible
      3. Click "Create Board" or "Create your first board" button
      4. Dialog opens — type "My First Board" in name input
      5. Click submit/create button
      6. Assert dialog closes
      7. Assert board card with text "My First Board" appears on dashboard
      8. Click the board card
      9. Assert URL changes to `/board/{some-uuid}`
    Expected Result: Board created, visible on dashboard, clickable
    Failure Indicators: Dialog doesn't open, board not created, no navigation
    Evidence: .sisyphus/evidence/task-10-create-board.png
  ```

  **Commit**: YES
  - Message: `feat: board management (dashboard, columns, settings, theme picker)`
  - Files: `src/routes/dashboard.tsx`, `src/components/board-card.tsx`, `src/components/create-board-dialog.tsx`, `src/lib/queries/projects.ts`

- [ ] 11. Board View + Column CRUD

  **What to do**:
  - Implement `src/routes/board/$boardId.tsx` — the main kanban board view:
    - Fetch board data: project name, columns (ordered by position), issues per column (ordered by position)
    - Render columns side-by-side horizontally (scrollable if many columns)
    - Each column shows: column name, issue count, list of issue cards, '+' button at bottom for quick-add (placeholder, wired in Task 16)
  - Create `src/components/board/column.tsx` — single column component:
    - Column header with name (inline-editable on double-click) and kebab menu (rename, delete)
    - Column body: scrollable list of issue card placeholders (real cards in Task 14)
    - Column footer: '+' add issue button placeholder
  - Create `src/components/board/add-column-button.tsx` — '+ Add Column' button at the end of column row
  - Create `src/lib/queries/columns.ts` — query functions:
    - `getProjectColumns(projectId)` — fetch columns ordered by position
    - `createColumn(projectId, name)` — insert column with next position value
    - `updateColumn(columnId, updates)` — rename column
    - `reorderColumns(projectId, orderedIds)` — batch update positions
    - `deleteColumn(columnId)` — delete (will fail if column has issues due to RESTRICT FK)
  - Column deletion: show error toast if column has issues ("Move or delete issues first")
  - Sidebar (from Task 6): populate with actual board list for the current user, highlight active board

  **Must NOT do**:
  - Do NOT implement drag-and-drop for issues yet (Task 17)
  - Do NOT implement actual issue cards yet (Task 14) — just show placeholder cards or empty columns
  - Do NOT implement column drag-to-reorder (keep it simple — reorder via up/down buttons in kebab menu)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`, `frontend-ui-ux`]
    - `react-doctor`: Complex component composition, data fetching patterns
    - `frontend-ui-ux`: Column layout, responsive horizontal scroll, inline editing UX

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 12, 13)
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 14, 17
  - **Blocked By**: Tasks 6, 8

  **References**:
  - **File reference**: `src/routes/board/$boardId.tsx` (placeholder from Task 6) — replace with real content
  - **File reference**: `src/lib/supabase.ts` (from Task 3) — typed Supabase client
  - **Data Model reference**: `columns` table — `project_id`, `name`, `position`
  - **Data Model reference**: `issues.column_id` FK has ON DELETE RESTRICT — deletion fails if column has issues
  - **External**: shadcn [DropdownMenu](https://ui.shadcn.com/docs/components/dropdown-menu) for column kebab menu
  - **External**: shadcn [Toast/Sonner](https://ui.shadcn.com/docs/components/sonner) for error messages
  - **Pattern note**: Column position reorder: update all positions in a batch. Use `supabase.from('columns').upsert(columnsWithNewPositions)`
  - **Pattern note**: Inline column rename: double-click header text → input field → blur/Enter saves, Escape cancels

  **Acceptance Criteria**:
  - [ ] Board view shows columns side-by-side horizontally
  - [ ] Can create a new column (appears at end)
  - [ ] Can rename a column (inline edit on double-click)
  - [ ] Can reorder columns (up/down in menu)
  - [ ] Can delete empty column, blocked if column has issues
  - [ ] Sidebar shows board list with active board highlighted

  **QA Scenarios:**
  ```
  Scenario: Column CRUD operations
    Tool: Playwright
    Preconditions: Logged in, board created with default 3 columns
    Steps:
      1. Navigate to `/board/{boardId}`
      2. Assert 3 columns visible: "To Do", "In Progress", "Done"
      3. Click "+ Add Column" button
      4. Type "QA" in new column name input, submit
      5. Assert 4 columns now visible, "QA" is the rightmost
      6. Double-click on "QA" column header text
      7. Clear and type "Testing", press Enter
      8. Assert column header now shows "Testing"
      9. Open kebab menu on "Testing" column, click Delete
      10. Assert column is removed (3 columns remaining)
    Expected Result: Create, rename, delete column all work
    Failure Indicators: Column not created, rename doesn't save, delete fails
    Evidence: .sisyphus/evidence/task-11-column-crud.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: grouped with Wave 4 commit
  - Files: `src/routes/board/$boardId.tsx`, `src/components/board/column.tsx`, `src/components/board/add-column-button.tsx`, `src/lib/queries/columns.ts`

- [ ] 12. Board Settings + Member Management

  **What to do**:
  - Create board settings page or dialog accessible from board view (gear icon in header or sidebar):
    - Rename board (text input + save)
    - Delete board (with confirmation dialog — cascades all columns, members, and issues)
    - Member list: show all `project_members` for this board with avatar + email + role
  - Member management (owner only):
    - "Add Member" input: type an email address, click add. Inserts row into `project_members(project_id, invited_email, role='member')`
    - Remove member: click X next to a member (not self, not if they're owner)
    - Show status: if `user_id` is set → "Active", if null → "Pending" (hasn't signed up yet)
  - Create `src/lib/queries/members.ts` — query functions:
    - `getProjectMembers(projectId)` — fetch members with role and user_id status
    - `addMember(projectId, email)` — insert invited_email row
    - `removeMember(projectId, memberId)` — delete member row
  - Create `src/lib/queries/projects.ts` additions:
    - `updateProject(projectId, updates)` — rename
    - `deleteProject(projectId)` — delete (CASCADE handles cleanup)
  - Only the project owner can manage members and delete the board. Show these controls only if current user's role is 'owner'.

  **Must NOT do**:
  - Do NOT send invite emails (just insert DB row)
  - Do NOT implement ownership transfer
  - Do NOT add roles beyond 'owner' and 'member'

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`]
    - `react-doctor`: Form validation, conditional rendering based on role

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 11, 13)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 19
  - **Blocked By**: Task 8

  **References**:
  - **Data Model reference**: `project_members` table — `user_id` (nullable), `invited_email`, `role` ('owner'/'member')
  - **Data Model reference**: `projects` ON DELETE CASCADE — deleting project cascades to members, columns, issues
  - **File reference**: `src/components/avatar.tsx` (from Task 9) — render member avatars in list
  - **External**: shadcn [AlertDialog](https://ui.shadcn.com/docs/components/alert-dialog) for delete confirmation
  - **External**: shadcn [Badge](https://ui.shadcn.com/docs/components/badge) for role/status labels
  - **Pattern note**: Member status logic: `user_id !== null ? 'Active' : 'Pending'`
  - **Pattern note**: Owner check: query current user's role from project_members, conditionally render management UI

  **Acceptance Criteria**:
  - [ ] Can rename board from settings
  - [ ] Can delete board (with confirmation), redirects to dashboard
  - [ ] Member list shows all members with avatar, email, role, status
  - [ ] Owner can add member by email
  - [ ] Owner can remove non-owner members
  - [ ] Non-owner cannot see add/remove member controls

  **QA Scenarios:**
  ```
  Scenario: Add member to board
    Tool: Playwright
    Preconditions: Logged in as board owner
    Steps:
      1. Navigate to board settings
      2. Assert member list shows current user as owner
      3. Type `girlfriend@example.com` in add member input
      4. Click add button
      5. Assert new member appears with email, role "member", status "Pending"
      6. Assert avatar shows correct first letter and color
    Expected Result: Member added, shown as pending
    Failure Indicators: Member not added, wrong status, avatar not rendering
    Evidence: .sisyphus/evidence/task-12-add-member.png

  Scenario: Delete board with confirmation
    Tool: Playwright
    Preconditions: Board exists with some data
    Steps:
      1. Navigate to board settings
      2. Click "Delete Board" button
      3. Assert confirmation dialog appears
      4. Click confirm/delete in dialog
      5. Assert redirect to `/dashboard`
      6. Assert deleted board is gone from board list
    Expected Result: Board deleted, redirect to dashboard
    Failure Indicators: No confirmation, board still exists, no redirect
    Evidence: .sisyphus/evidence/task-12-delete-board.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: grouped with Wave 4 commit
  - Files: `src/components/board/board-settings.tsx`, `src/lib/queries/members.ts`, `src/lib/queries/projects.ts`

- [ ] 13. Theme Picker Settings Page

  **What to do**:
  - Create `src/routes/settings.tsx` (or update placeholder from Task 6):
    - Grid/gallery of theme preset cards (10-15 from Task 5's theme registry)
    - Each card shows: theme name, color preview swatches, active indicator
    - Clicking a card applies that theme immediately (updates CSS vars via ThemeProvider)
    - Dark/light toggle prominently placed at top
    - Active theme has a visual indicator (border, checkmark)
  - Persist selected theme to localStorage via ThemeProvider (from Task 5)
  - Use shadcn Card components for theme preview cards
  - Include a "back" navigation to return to previous page

  **Must NOT do**:
  - Do NOT allow custom theme creation (just preset picker)
  - Do NOT add user profile editing (just themes)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Gallery layout, visual design of theme preview cards

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 11, 12)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 19
  - **Blocked By**: Tasks 5, 6, 8

  **References**:
  - **File reference**: `src/lib/themes.ts` (from Task 5) — theme registry array with ids, names, CSS vars
  - **File reference**: `src/components/theme-provider.tsx` (from Task 5) — use context to set active theme
  - **File reference**: `src/routes/settings.tsx` (placeholder from Task 6) — replace with real content
  - **External**: shadcn [Card](https://ui.shadcn.com/docs/components/card) for theme preview cards
  - **Pattern note**: Theme preview: each card should show small color swatches for background, foreground, primary, accent colors from that theme's CSS vars

  **Acceptance Criteria**:
  - [ ] Settings page shows grid of 10-15 theme cards
  - [ ] Clicking a theme card applies it immediately (colors change)
  - [ ] Active theme has visual indicator
  - [ ] Theme persists after navigating away and back
  - [ ] Dark/light toggle works on settings page

  **QA Scenarios:**
  ```
  Scenario: Switch theme from settings
    Tool: Playwright
    Preconditions: Logged in, on settings page
    Steps:
      1. Navigate to `/settings`
      2. Assert grid of theme cards visible (at least 10)
      3. Note current background color of `document.documentElement`
      4. Click a different theme card (not the currently active one)
      5. Assert background color changed
      6. Assert clicked card now has active indicator
      7. Navigate to `/dashboard`
      8. Assert theme is still applied (same background color)
    Expected Result: Theme switches, persists across navigation
    Failure Indicators: Colors don't change, active indicator wrong, theme resets on nav
    Evidence: .sisyphus/evidence/task-13-theme-picker.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: grouped with Wave 4 commit
  - Files: `src/routes/settings.tsx`


### Wave 5: Issue Data Layer

- [ ] 14. Issue CRUD + Card Rendering

  **What to do**:
  - Create `src/lib/queries/issues.ts` — all issue query functions:
    - `getColumnIssues(columnId)` — fetch issues in a column, ordered by position
    - `getProjectIssues(projectId)` — fetch all issues in a project (for filter bar)
    - `createIssue(data)` — insert issue with auto-calculated position (max position in column + 1)
    - `updateIssue(issueId, updates)` — update any issue fields
    - `deleteIssue(issueId)` — delete issue
    - `moveIssue(issueId, newColumnId, newPosition)` — update column_id and position (used by DnD later)
    - `reorderIssues(columnId, orderedIds)` — batch update positions within a column
  - Create `src/components/board/issue-card.tsx` — the card that appears in columns:
    - Shows: title (truncated if long), priority indicator (colored dot or badge), due date (if set, with overdue styling), assignee avatar (if set), label chips (if any)
    - Clickable — triggers side panel open (wired in Task 15)
    - Compact design: fits well in a column without taking too much space
  - Wire issue cards into `src/components/board/column.tsx` (from Task 11):
    - Fetch and render actual issue cards inside each column
    - Pass issue data from board-level query to column components
  - Create `src/components/board/create-issue-dialog.tsx` — full issue creation form:
    - Fields: title (required), description, priority dropdown (low/medium/high, default medium), labels chip input, assignee email dropdown (from project members), due date picker (shadcn Calendar/DatePicker)
    - Accessible from column kebab menu or board-level action

  **Must NOT do**:
  - Do NOT implement drag-and-drop (Task 17)
  - Do NOT implement the side panel (Task 15)
  - Do NOT implement inline quick-add (Task 16) — just the full dialog

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`, `frontend-ui-ux`]
    - `react-doctor`: Complex state management, data fetching, list rendering
    - `frontend-ui-ux`: Card design, compact layout, visual priority/date indicators

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential gate)
  - **Parallel Group**: Wave 5 (solo)
  - **Blocks**: Tasks 15, 16, 17, 18
  - **Blocked By**: Task 11

  **References**:
  - **File reference**: `src/components/board/column.tsx` (from Task 11) — wire issue cards into the column body area
  - **File reference**: `src/lib/supabase.ts` (from Task 3) — typed client for queries
  - **File reference**: `src/lib/database.types.ts` (from Task 3) — Issue type definition
  - **File reference**: `src/components/avatar.tsx` (from Task 9) — render assignee avatar on cards
  - **Data Model reference**: `issues` table — all fields, priority CHECK constraint, labels as text[]
  - **Data Model reference**: `issues.position` — integer ordering within a column
  - **External**: shadcn [Calendar](https://ui.shadcn.com/docs/components/calendar) / [DatePicker](https://ui.shadcn.com/docs/components/date-picker) for due date
  - **External**: shadcn [Select](https://ui.shadcn.com/docs/components/select) for priority dropdown
  - **External**: shadcn [Badge](https://ui.shadcn.com/docs/components/badge) for label chips and priority indicator
  - **Pattern note**: Position calculation on create: `SELECT COALESCE(MAX(position), -1) + 1 FROM issues WHERE column_id = $1`
  - **Pattern note**: Labels chip input: text input that adds to array on Enter/comma, shows chips with X to remove. Autocomplete from existing labels: `SELECT DISTINCT unnest(labels) FROM issues WHERE project_id = $1`

  **Acceptance Criteria**:
  - [ ] Issue cards render inside columns with title, priority, due date, assignee, labels
  - [ ] Can create an issue via dialog with all fields
  - [ ] New issue appears in the correct column
  - [ ] Can delete an issue
  - [ ] Priority indicator visually distinguishes low/medium/high
  - [ ] Due date shows overdue styling if past today

  **QA Scenarios:**
  ```
  Scenario: Create issue and see it on board
    Tool: Playwright
    Preconditions: Logged in, board with default columns exists
    Steps:
      1. Navigate to board view
      2. Open create issue dialog (from column menu or board action)
      3. Fill: title="Fix login bug", priority=high, due date=tomorrow, labels=["bug"]
      4. Select "To Do" column
      5. Submit
      6. Assert issue card appears in "To Do" column
      7. Assert card shows: "Fix login bug" title, high priority indicator (red), due date, "bug" label chip
    Expected Result: Issue created with all fields visible on card
    Failure Indicators: Card not appearing, fields missing, wrong column
    Evidence: .sisyphus/evidence/task-14-create-issue.png

  Scenario: Delete issue
    Tool: Playwright
    Preconditions: Board with at least one issue
    Steps:
      1. Right-click or open menu on an issue card
      2. Click delete option
      3. Assert issue card is removed from the column
    Expected Result: Issue deleted from board
    Failure Indicators: Issue still visible, error toast
    Evidence: .sisyphus/evidence/task-14-delete-issue.png
  ```

  **Commit**: YES
  - Message: `feat: issue CRUD + card rendering`
  - Files: `src/lib/queries/issues.ts`, `src/components/board/issue-card.tsx`, `src/components/board/create-issue-dialog.tsx`, `src/components/board/column.tsx`

### Wave 6: Issue Interactions

- [ ] 15. Issue Side Panel

  **What to do**:
  - Create `src/components/board/issue-panel.tsx` — slide-in panel from the right side:
    - Opens when clicking an issue card on the board
    - Shows all issue fields in editable form:
      - Title: inline editable (click to edit, blur/Enter to save)
      - Description: textarea with auto-save on blur
      - Priority: dropdown (low/medium/high)
      - Labels: chip input with autocomplete from existing project labels
      - Assignee: dropdown of project members (from project_members table)
      - Due date: shadcn DatePicker
      - Column: dropdown to move issue between columns
    - Delete button with confirmation
    - Close button (X) and click-outside-to-close
    - Board remains visible but dimmed/pushed behind the panel
  - Use shadcn Sheet component as the base for the slide-in panel
  - All field changes save individually on change (no "Save" button — auto-save pattern)
  - Wire into board view: clicking issue card opens panel with that issue's data

  **Must NOT do**:
  - Do NOT implement comments or discussion (excluded from scope)
  - Do NOT implement file attachments
  - Do NOT navigate to a separate page — keep it as overlay on board

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`, `frontend-ui-ux`]
    - `react-doctor`: Complex form state, auto-save pattern, conditional rendering
    - `frontend-ui-ux`: Panel layout, inline editing UX, form design

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 16, 17, 18)
  - **Parallel Group**: Wave 6
  - **Blocks**: Task 19
  - **Blocked By**: Task 14

  **References**:
  - **File reference**: `src/lib/queries/issues.ts` (from Task 14) — `updateIssue()` for auto-save
  - **File reference**: `src/lib/queries/members.ts` (from Task 12) — `getProjectMembers()` for assignee dropdown
  - **File reference**: `src/components/board/issue-card.tsx` (from Task 14) — wire onClick to open panel
  - **External**: shadcn [Sheet](https://ui.shadcn.com/docs/components/sheet) — use `side="right"` for right-slide panel
  - **External**: shadcn [Calendar](https://ui.shadcn.com/docs/components/calendar), [Select](https://ui.shadcn.com/docs/components/select), [Textarea](https://ui.shadcn.com/docs/components/textarea)
  - **Pattern note**: Auto-save: debounce field changes (300ms), then call `updateIssue()`. Show subtle "saving..." / "saved" indicator.
  - **Pattern note**: Sheet from shadcn can be opened/closed via state. Board view manages `selectedIssueId` state.

  **Acceptance Criteria**:
  - [ ] Clicking issue card opens side panel from right
  - [ ] All fields displayed and editable
  - [ ] Changes auto-save (no save button needed)
  - [ ] Can change issue's column from the panel
  - [ ] Close button and click-outside close the panel
  - [ ] Delete button removes issue and closes panel

  **QA Scenarios:**
  ```
  Scenario: Edit issue via side panel
    Tool: Playwright
    Preconditions: Board with at least one issue
    Steps:
      1. Click on an issue card
      2. Assert side panel slides in from right
      3. Assert all fields are visible: title, description, priority, labels, assignee, due date, column
      4. Change priority from "medium" to "high" via dropdown
      5. Wait 500ms (debounce)
      6. Close panel (click X or outside)
      7. Assert issue card on board now shows high priority indicator
    Expected Result: Edit saved, reflected on board card
    Failure Indicators: Panel doesn't open, changes not saved, card not updated
    Evidence: .sisyphus/evidence/task-15-side-panel-edit.png
  ```

  **Commit**: YES
  - Message: `feat: issue interactions (side panel, quick-add, DnD, filters)`
  - Files: `src/components/board/issue-panel.tsx`

- [ ] 16. Quick-Add (Inline + Mobile FAB)

  **What to do**:
  - **Inline quick-add** (desktop):
    - Add a '+' button at the bottom of each column (in `column.tsx` footer)
    - Clicking reveals an inline text input within the column
    - User types a title, presses Enter → creates issue with just the title (default priority=medium, no labels, no due date, no assignee)
    - Press Escape or click away → cancel
    - New card appears immediately at the bottom of the column
  - **Floating Action Button** (mobile):
    - Fixed-position FAB in bottom-right corner (visible on small screens, hidden on desktop via media query)
    - Clicking opens a minimal dialog: title input + column picker dropdown
    - Submit creates the issue in the selected column
    - Column picker defaults to the first column ("To Do")
  - Create `src/components/board/inline-add.tsx` for the inline column input
  - Create `src/components/board/quick-add-fab.tsx` for the floating button + dialog
  - Both use `createIssue()` from `src/lib/queries/issues.ts` (Task 14)

  **Must NOT do**:
  - Do NOT add all fields to quick-add (just title, optionally column) — full editing via side panel
  - Do NOT make FAB visible on desktop (mobile only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`, `frontend-ui-ux`]
    - `react-doctor`: Form handling, focus management, keyboard events
    - `frontend-ui-ux`: Inline input UX, FAB placement, mobile interaction

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15, 17, 18)
  - **Parallel Group**: Wave 6
  - **Blocks**: Task 19
  - **Blocked By**: Task 14

  **References**:
  - **File reference**: `src/components/board/column.tsx` (from Task 11) — add inline input to column footer
  - **File reference**: `src/lib/queries/issues.ts` (from Task 14) — `createIssue()` function
  - **File reference**: `src/lib/queries/columns.ts` (from Task 11) — get columns for FAB column picker
  - **Pattern note**: Inline add UX: button click → replace button with input → auto-focus → Enter creates, Escape cancels, blur cancels
  - **Pattern note**: FAB positioning: `fixed bottom-4 right-4 z-50 md:hidden` (Tailwind classes)

  **Acceptance Criteria**:
  - [ ] Inline '+' at bottom of each column creates issue on Enter
  - [ ] Escape cancels inline add
  - [ ] FAB visible on mobile viewport, hidden on desktop
  - [ ] FAB opens dialog with title + column picker
  - [ ] Both create issue successfully in correct column

  **QA Scenarios:**
  ```
  Scenario: Inline quick-add creates issue
    Tool: Playwright
    Preconditions: Board view open, "To Do" column visible
    Steps:
      1. Click '+' button at bottom of "To Do" column
      2. Assert input appears and is focused
      3. Type "Quick issue"
      4. Press Enter
      5. Assert new card "Quick issue" appears at bottom of "To Do" column
      6. Assert input disappears (back to '+' button)
    Expected Result: Issue created inline with minimal friction
    Failure Indicators: Input not appearing, issue not created, card not visible
    Evidence: .sisyphus/evidence/task-16-inline-add.png

  Scenario: FAB visible on mobile only
    Tool: Playwright
    Preconditions: Board view open
    Steps:
      1. Set viewport to 1024x768 (desktop)
      2. Assert FAB button is NOT visible
      3. Set viewport to 375x812 (iPhone)
      4. Assert FAB button IS visible (fixed bottom-right)
    Expected Result: FAB responsive visibility works
    Failure Indicators: FAB visible on desktop, or not visible on mobile
    Evidence: .sisyphus/evidence/task-16-fab-responsive.png
  ```

  **Commit**: YES (groups with Wave 6)
  - Message: grouped with Wave 6 commit
  - Files: `src/components/board/inline-add.tsx`, `src/components/board/quick-add-fab.tsx`, `src/components/board/column.tsx`

- [ ] 17. Drag-and-Drop Kanban

  **What to do**:
  - Install `@dnd-kit/react@^0.3.2` and `@dnd-kit/helpers@^0.3.2` (and `@dnd-kit/abstract` for CollisionPriority)
  - Wire drag-and-drop into the board view:
    - Wrap board columns area in `<DragDropProvider>` (from `@dnd-kit/react`)
    - Each issue card uses `useSortable` hook with `group` prop set to its column ID
    - Each column container uses `useDroppable` hook with `collisionPriority: CollisionPriority.Low`
    - Use `move` helper from `@dnd-kit/helpers` for cross-column state updates
  - Board state shape: `Record<string, string[]>` (column ID → issue ID array)
  - Event handlers:
    - `onDragStart`: save snapshot to `useRef` for cancel revert
    - `onDragOver`: call `setItems(items => move(items, event))` for optimistic live updates
    - `onDragEnd`: if `event.canceled`, revert to snapshot. Otherwise, persist new positions to Supabase
    - NO `onDragCancel` — check `event.canceled` in `onDragEnd`
  - Persistence: after drag end, update the `column_id` and `position` of affected issues in Supabase
  - Add drag styling: dragged card gets subtle shadow/scale, drop targets get highlight
  - Add `touch-action: none` on draggable cards for mobile support
  - Test on Chrome. If Safari drag offset regression (#1910) is encountered, add a note but don't block on it.

  **Must NOT do**:
  - Do NOT use `@dnd-kit/core` legacy API (`DndContext`, `SortableContext`, `{...listeners}` spread)
  - Do NOT use separate `TouchSensor` — PointerSensor handles all input types
  - Do NOT implement column drag-to-reorder (only issue cards are draggable)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`]
    - `react-doctor`: Complex hook composition, state management, DOM interaction patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15, 16, 18)
  - **Parallel Group**: Wave 6
  - **Blocks**: Task 19
  - **Blocked By**: Tasks 14, 11

  **References**:
  - **External**: [dndkit Multiple Sortable Lists guide](https://docs.dndkit.com/react/guides/multiple-sortable-lists) — the official kanban pattern using `group` prop + `move` helper
  - **External**: [@dnd-kit/react API](https://docs.dndkit.com/react) — `DragDropProvider`, `useSortable`, `useDroppable`
  - **External**: [@dnd-kit/helpers](https://docs.dndkit.com/helpers) — `move` function for cross-container state
  - **External**: [@dnd-kit/abstract](https://docs.dndkit.com/abstract) — `CollisionPriority` enum for column droppables
  - **File reference**: `src/components/board/column.tsx` (from Task 11) — add `useDroppable` hook
  - **File reference**: `src/components/board/issue-card.tsx` (from Task 14) — add `useSortable` hook
  - **File reference**: `src/routes/board/$boardId.tsx` (from Task 11) — wrap in `DragDropProvider`
  - **File reference**: `src/lib/queries/issues.ts` (from Task 14) — `moveIssue()` and `reorderIssues()` for persistence
  - **Pattern note**: State shape MUST be `Record<string, string[]>` for `move` helper to work
  - **Pattern note**: Use `onDragOver` for state updates (NOT `onDragEnd`) to avoid removeChild error (#1940)
  - **Pattern note**: `useSortable({ id, index, type: 'item', accept: 'item', group: columnId })`
  - **Pattern note**: `useDroppable({ id: columnId, type: 'column', accept: 'item', collisionPriority: CollisionPriority.Low })`
  - **Risk**: Safari drag offset regression #1910 in v0.3.x. Test and document. If broken, note for future fix (pin v0.2.4).

  **Acceptance Criteria**:
  - [ ] Can drag issue card within same column (reorder)
  - [ ] Can drag issue card to different column
  - [ ] Card position persists after page refresh
  - [ ] Drag provides visual feedback (shadow, placeholder)
  - [ ] Escape during drag reverts to original position
  - [ ] Mobile touch drag works (with delay or touch-action handling)

  **QA Scenarios:**
  ```
  Scenario: Drag issue between columns
    Tool: Playwright
    Preconditions: Board with issues in "To Do" column
    Steps:
      1. Navigate to board view
      2. Note first issue card in "To Do" column (store its text)
      3. Drag that card to "In Progress" column (Playwright mouse drag)
      4. Assert card is now in "In Progress" column
      5. Assert card is NOT in "To Do" column
      6. Refresh the page
      7. Assert card is STILL in "In Progress" column (persisted)
    Expected Result: Cross-column drag works and persists
    Failure Indicators: Card snaps back, not in new column after refresh
    Evidence: .sisyphus/evidence/task-17-drag-between-columns.png

  Scenario: Drag cancel reverts
    Tool: Playwright
    Preconditions: Board with issues
    Steps:
      1. Start dragging an issue card
      2. Press Escape during drag
      3. Assert card is back in its original position
    Expected Result: Cancel reverts drag cleanly
    Failure Indicators: Card stuck in wrong position, visual glitch
    Evidence: .sisyphus/evidence/task-17-drag-cancel.png
  ```

  **Commit**: YES (groups with Wave 6)
  - Message: grouped with Wave 6 commit
  - Files: `src/routes/board/$boardId.tsx`, `src/components/board/column.tsx`, `src/components/board/issue-card.tsx`

- [ ] 18. Filter Bar

  **What to do**:
  - Create `src/components/board/filter-bar.tsx` — horizontal bar above the columns:
    - **Search**: text input that filters visible cards by title (client-side filter, no API call)
    - **Assignee filter**: dropdown with project members ("All", then each member email). Filter cards by assignee_email
    - **Priority filter**: dropdown ("All", "High", "Medium", "Low"). Filter cards by priority
    - **Label filter**: dropdown of existing labels in this project (collected from all issues). Filter cards that include selected label
    - Multiple filters can be active simultaneously (AND logic)
    - Filter state is local (URL params or React state) — not persisted to DB
  - Wire into board view: filter bar renders above columns, filtered state affects which issue cards are visible
  - Clear all filters button
  - Show count of visible issues vs total when filters are active
  - Labels for dropdown: aggregate unique labels from all issues in the project using `getProjectIssues()` from Task 14

  **Must NOT do**:
  - Do NOT save filter preferences to database
  - Do NOT add sort functionality (just filter)
  - Do NOT add date range filter (keep it simple)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`]
    - `react-doctor`: Filter state management, derived data, React rendering optimization

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15, 16, 17)
  - **Parallel Group**: Wave 6
  - **Blocks**: Task 19
  - **Blocked By**: Task 14

  **References**:
  - **File reference**: `src/lib/queries/issues.ts` (from Task 14) — `getProjectIssues()` for aggregating labels
  - **File reference**: `src/lib/queries/members.ts` (from Task 12) — `getProjectMembers()` for assignee dropdown options
  - **File reference**: `src/routes/board/$boardId.tsx` (from Task 11) — add filter bar above columns, pass filter state down
  - **External**: shadcn [Select](https://ui.shadcn.com/docs/components/select) for filter dropdowns
  - **External**: shadcn [Input](https://ui.shadcn.com/docs/components/input) for search
  - **Pattern note**: Client-side filtering: derive visible issues from full list using useMemo. Don't re-fetch from Supabase on filter change.
  - **Pattern note**: Filter interaction with DnD: filtered-out cards should be hidden from columns but not lost. If drag happens while filter is active, the move logic should work on the full data set.

  **Acceptance Criteria**:
  - [ ] Search input filters cards by title (case-insensitive)
  - [ ] Assignee dropdown filters by assigned email
  - [ ] Priority dropdown filters by priority level
  - [ ] Label dropdown filters by label
  - [ ] Multiple filters combine with AND logic
  - [ ] "Clear filters" resets all
  - [ ] Visible count shown when filters active

  **QA Scenarios:**
  ```
  Scenario: Filter by priority
    Tool: Playwright
    Preconditions: Board with 3+ issues of mixed priorities
    Steps:
      1. Navigate to board view
      2. Note total visible issue cards (e.g., 5)
      3. Select "High" from priority filter dropdown
      4. Assert only high-priority cards are visible
      5. Assert count indicator shows (e.g., "Showing 2 of 5")
      6. Click "Clear filters"
      7. Assert all 5 cards visible again
    Expected Result: Filter works, count updates, clear resets
    Failure Indicators: Wrong cards shown, count incorrect, clear doesn't work
    Evidence: .sisyphus/evidence/task-18-filter-priority.png

  Scenario: Search by title
    Tool: Playwright
    Preconditions: Board with issues including one titled "Fix login bug"
    Steps:
      1. Type "login" in search input
      2. Assert only cards with "login" in title are visible
      3. Clear search input
      4. Assert all cards visible again
    Expected Result: Search filters by title substring
    Failure Indicators: No filtering, case-sensitive mismatch
    Evidence: .sisyphus/evidence/task-18-search-title.png
  ```

  **Commit**: YES (groups with Wave 6)
  - Message: grouped with Wave 6 commit
  - Files: `src/components/board/filter-bar.tsx`, `src/routes/board/$boardId.tsx`


### Wave 7: Polish + Final Deploy

- [ ] 19. Mobile Responsive + Touch DnD Polish

  **What to do**:
  - Review all pages/components on mobile viewport (375x812 iPhone SE, 390x844 iPhone 14):
    - Dashboard: board cards stack vertically on mobile
    - Board view: columns scroll horizontally (swipeable), each column takes ~85% viewport width on mobile
    - Sidebar: collapses to hamburger menu on mobile (shadcn Sidebar has this built-in)
    - Header: compact on mobile (avatar + hamburger, no full email)
    - Side panel: full-width on mobile (not partial-width overlay)
    - Filter bar: collapsible on mobile (filter icon that expands)
    - Create issue dialog: full-screen on mobile
  - Touch DnD tuning:
    - Add `PointerSensor` activation constraint: 200ms delay to distinguish scroll from drag
    - Ensure `touch-action: none` on draggable elements during drag
    - Test drag on mobile viewport in Playwright
  - Fix any overflow, text truncation, or touch target size issues (<48px tap targets)
  - Ensure theme toggle and theme picker are accessible on mobile

  **Must NOT do**:
  - Do NOT implement PWA (no manifest, no service worker)
  - Do NOT add platform-specific code (no user-agent sniffing)
  - Just use responsive CSS (Tailwind breakpoints)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-doctor`, `frontend-ui-ux`, `playwright`]
    - `react-doctor`: Component rendering issues on different viewports
    - `frontend-ui-ux`: Responsive design patterns, mobile UX
    - `playwright`: Test on multiple viewport sizes

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 20 if 20 is decoupled)
  - **Parallel Group**: Wave 7
  - **Blocks**: Task 20
  - **Blocked By**: Tasks 15, 16, 17

  **References**:
  - **File reference**: All component files from Tasks 10-18 — review each for mobile responsiveness
  - **File reference**: `src/components/layout/sidebar.tsx` (from Task 6) — mobile collapse behavior
  - **External**: [shadcn Sidebar mobile](https://ui.shadcn.com/docs/components/sidebar) — built-in mobile collapse, trigger via Sheet
  - **External**: [dndkit PointerSensor activation](https://docs.dndkit.com/react/sensors) — delay constraint config for touch
  - **Pattern note**: Tailwind responsive: `md:` prefix for desktop-only styles, default styles for mobile-first
  - **Pattern note**: Column horizontal scroll on mobile: `flex overflow-x-auto snap-x snap-mandatory` with `min-w-[85vw] snap-center` on each column

  **Acceptance Criteria**:
  - [ ] Dashboard stacks vertically on mobile viewport
  - [ ] Board columns scroll horizontally on mobile
  - [ ] Sidebar collapses to hamburger on mobile
  - [ ] Side panel is full-width on mobile
  - [ ] Touch drag works with activation delay
  - [ ] All tap targets ≥ 44px
  - [ ] No horizontal overflow on any page

  **QA Scenarios:**
  ```
  Scenario: Mobile board view layout
    Tool: Playwright
    Preconditions: Board with 3 columns and issues
    Steps:
      1. Set viewport to 375x812
      2. Navigate to board view
      3. Assert columns are horizontally scrollable (overflow-x)
      4. Assert each column takes ~85% viewport width
      5. Swipe/scroll to see second column
      6. Assert sidebar is NOT visible (collapsed)
      7. Click hamburger/menu icon
      8. Assert sidebar slides in
      9. Screenshot capture
    Expected Result: Clean mobile layout, scrollable columns, collapsible sidebar
    Failure Indicators: Columns stacked vertically, overflow, sidebar always visible
    Evidence: .sisyphus/evidence/task-19-mobile-board.png

  Scenario: Mobile touch drag activation
    Tool: Playwright
    Preconditions: Mobile viewport, board with issues
    Steps:
      1. Set viewport to 375x812
      2. Quick tap on issue card (< 100ms)
      3. Assert drag does NOT activate (card should be clickable for side panel)
      4. Long press on issue card (> 250ms), then drag
      5. Assert drag activates (card lifts/moves)
    Expected Result: Short tap = click, long press = drag
    Failure Indicators: Tap triggers drag, or drag never activates on mobile
    Evidence: .sisyphus/evidence/task-19-touch-drag.png
  ```

  **Commit**: YES
  - Message: `feat: mobile responsive + touch DnD polish`
  - Files: Various component files (responsive CSS adjustments)

- [ ] 20. Final Vercel Deploy + Smoke Test

  **What to do**:
  - Ensure all env vars are set in Vercel dashboard (VITE_SUPABASE_URL, VITE_SUPABASE_KEY)
  - Trigger production deployment to Vercel
  - Run comprehensive smoke test on the live URL:
    - Auth: signup new user, login, logout, login again
    - Dashboard: create a board, see it listed
    - Board: see default columns, add a column, rename it, delete it
    - Issues: create issue via dialog, see it on board, edit via side panel
    - DnD: drag issue between columns, refresh, verify persistence
    - Quick-add: inline add in column
    - Filter: search by title, filter by priority
    - Theme: switch theme, toggle dark mode
    - Collaboration: add a member email, verify it appears in member list
    - Mobile: resize browser to mobile viewport, verify responsive layout
  - Fix any deployment-specific issues (env vars, build errors, Vercel config)
  - Document the final Vercel URL

  **Must NOT do**:
  - Do NOT set up CI/CD pipeline (manual deploy is fine)
  - Do NOT configure custom domain

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`playwright`]
    - `playwright`: Full smoke test on live deployment

  **Parallelization**:
  - **Can Run In Parallel**: NO (final sequential step)
  - **Parallel Group**: Wave 7 (after Task 19)
  - **Blocks**: Final Verification Wave
  - **Blocked By**: All tasks (1-19)

  **References**:
  - **File reference**: `vercel.json` — verify rewrite config
  - **File reference**: `.env.example` — checklist of env vars to set in Vercel
  - **External**: Vercel deployment dashboard
  - **Pattern note**: Vercel framework preset: "Other" (not auto-detect)

  **Acceptance Criteria**:
  - [ ] App deploys successfully to Vercel
  - [ ] All smoke test scenarios pass on live URL
  - [ ] No console errors in production build
  - [ ] Vercel URL documented

  **QA Scenarios:**
  ```
  Scenario: Full production smoke test
    Tool: Playwright
    Preconditions: Vercel deployment complete, live URL available
    Steps:
      1. Navigate to live Vercel URL
      2. Sign up with `smoketest@example.com` / `SmokeTest123!`
      3. Assert redirect to dashboard
      4. Create board "Smoke Test Board"
      5. Assert board card visible on dashboard
      6. Click into board
      7. Assert 3 default columns visible
      8. Click '+' in "To Do" column, type "Smoke issue", press Enter
      9. Assert issue card appears
      10. Drag "Smoke issue" card to "In Progress" column
      11. Assert card is now in "In Progress"
      12. Click on the card → assert side panel opens
      13. Change priority to "High" in side panel
      14. Close panel, assert card shows high priority indicator
      15. Open settings, switch to a different theme
      16. Assert colors change
      17. Toggle dark mode, assert dark theme applied
      18. Refresh page — assert everything persisted (card in In Progress, high priority, theme)
    Expected Result: Complete end-to-end flow works on production
    Failure Indicators: Any step fails, data not persisted, visual glitches
    Evidence: .sisyphus/evidence/task-20-production-smoke.png
  ```

  **Commit**: YES
  - Message: `chore: final deploy verification`
  - Files: `vercel.json` (if any fixes needed)

---
## Final Verification Wave (after ALL implementation tasks)

> Stripped down — no Playwright QA. Build check + scope review only.

- [ ] F1. **Build + Type Check** — `visual-engineering`
  Run `npm run build` and `tsc --noEmit`. Fix any build errors or type errors. Verify app starts with `npm run dev`.
  Output: `Build [PASS/FAIL] | Types [PASS/FAIL]`

- [ ] F2. **Code Quality Scan** — `visual-engineering`
  Review all files for: `as any`/`@ts-ignore`, empty catches, `console.log` in non-dev code, commented-out code, unused imports. Verify no `@dnd-kit/core` legacy imports — only `@dnd-kit/react` and `@dnd-kit/helpers`. Check no `service_role` key in client code. Check no `raw_user_meta_data` usage.
  Output: `Files [N clean/N issues] | Forbidden Patterns [CLEAN/N found] | VERDICT`

- [ ] F3. **Scope Fidelity Check** — `visual-engineering`
  For each task: read "What to do", verify it was built. Check "Must NOT Have" compliance (no comments, attachments, notifications, activity log, time tracking, realtime, Google OAuth). Flag anything built that wasn't in the plan.
  Output: `Tasks [N/N compliant] | Scope [CLEAN/N violations] | VERDICT`

---

## Commit Strategy

| After | Message | Files |
|-------|---------|-------|
| T1 | `chore: scaffold tanstack start + shadcn + SPA config` | project root |
| T2 | `chore: add supabase migration SQL` | supabase/migrations/ |
| T3-T7 | `feat: platform infrastructure (supabase client, vercel, theme, layout)` | src/lib/, vercel.json, src/routes/, src/styles/ |
| T8-T9 | `feat: auth system + avatar utility` | src/routes/login, src/routes/signup, src/lib/auth, src/lib/avatar |
| T10-T13 | `feat: board management (dashboard, columns, settings, theme picker)` | src/routes/dashboard, src/routes/board, src/components/ |
| T14 | `feat: issue CRUD + card rendering` | src/lib/issues, src/components/issue-card |
| T15-T18 | `feat: issue interactions (side panel, quick-add, DnD, filters)` | src/components/ |
| T19 | `feat: mobile responsive + touch DnD polish` | src/styles/, src/components/ |
| T20 | `chore: final deploy verification` | vercel.json |

---

## Success Criteria

### Verification Commands
```bash
npm run build        # Expected: successful build, no errors
npm run dev          # Expected: app loads at localhost, no console errors
tsc --noEmit         # Expected: no type errors
```

### Final Checklist
- [ ] `npm run build` succeeds
- [ ] `tsc --noEmit` passes
- [ ] App runs on `npm run dev`
- [ ] All "Must Have" items present
- [ ] All "Must NOT Have" items absent
- [ ] Vercel deployment works (after user sets env vars)
