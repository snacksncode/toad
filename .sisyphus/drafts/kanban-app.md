# Draft: Toad — Kanban Board / Issue Tracker

## Requirements (confirmed)
- **Deployment**: Vercel
- **Framework**: TanStack Start (SPA mode, `spa: { enabled: true }`)
- **Drag & Drop**: `@dnd-kit/react` (NEW API, not legacy `@dnd-kit/core`)
- **UI**: shadcn (official TanStack Start support) + tweakcn (42 themes, design-time)
- **Users**: 2 users minimum (him + girlfriend)
- **Use case**: Quick issue logging from phone or laptop → backlog → kanban board
- **Auth**: Email + password login (no OAuth, no Google)
- **Realtime**: NO — refresh to see changes (simplifies architecture)
- **Offline**: NO — online only
- **Issue model**: Standard — title, description, priority, labels/tags, assignee
- **Board columns**: Customizable (create/rename/reorder)
- **Multi-board**: YES — multiple boards/projects
- **Mobile**: Secondary priority — responsive design, not PWA

## Technical Decisions
- **Database**: Supabase (Postgres + Auth + free tier, Vercel integration)
  - Free tier: 500MB DB, 50K MAUs, 1 week inactivity pause (non-issue for daily use)
- **DnD API**: New `@dnd-kit/react` with `DragDropProvider`, `useSortable` with `group` prop
  - Touch: PointerSensor with 200ms delay constraint for mobile
- **shadcn setup**: `npx shadcn@latest init -t tanstack` (official)
- **Theme toggle**: Manual class-based toggle (tweakcn generates CSS vars, need runtime toggle)
- **Auth approach**: Supabase Auth email+password (no OAuth providers)
- **DB access**: Supabase JS client (`@supabase/supabase-js`) — no ORM
- **Theme UX**: Theme picker gallery (~10-15 tweakcn presets) + dark/light toggle
- **Invite flow**: Add email to `project_members` table. No invite email sent.
  - When user signs up with that email, projects auto-appear via query
  - One email can belong to multiple projects, multiple people per project
- **Avatars**: First letter of email + deterministic color (hash email → index into color array)
  - No uploads, no Gravatar, purely computed client-side
- **Board nav**: Dashboard home (boards as cards) + sidebar inside board for quick switching

## Research Findings

### TanStack Start SPA Mode
- Config: `spa: { enabled: true }` in vite config
- Builds static HTML shell, JS bootstraps client-side
- Server functions still work as API calls
- Vercel deployment: works, needs rewrite rule for client-side routing
- Gotcha: not first-class Vercel partner but functional

### dnd-kit
- Actively maintained (last push March 5, 2026)
- TWO APIs exist: legacy (`@dnd-kit/core`) and new (`@dnd-kit/react`)
- New API is recommended, built for React 19 compatibility
- Official Multiple Sortable Lists guide exists for kanban pattern
- `move` helper from `@dnd-kit/helpers` handles cross-column moves
- Touch: PointerSensor (unified mouse/touch/pen), needs `touch-action: none`

### Auth (SIMPLIFIED)
- **Supabase Auth email+password**: `supabase.auth.signUp({ email, password })`
  - No Google OAuth — no Cloud Console, no client ID/secret, no redirect flows
- Session management via Supabase JS client (handles JWT automatically)
  - Collaboration model: `project_members(project_id, email)` table
  - Add email → they see the project when they log in
  - No invite emails needed — just DB row insert

### tweakcn
- Design-time tool (not runtime dependency)
- 42 preset themes with light+dark variants
- Outputs CSS variables for Tailwind v3/v4
- Runtime toggle needs manual implementation (class-based)

## Open Questions (ALL RESOLVED)
- ~~Auth~~: Supabase Auth email+password ✓
- ~~DB access~~: Supabase JS client ✓
- ~~Invite flow~~: Email-based project membership ✓
- ~~Theme switching~~: Theme picker gallery ✓
- ~~Board CRUD~~: Dashboard home + sidebar ✓
- ~~Issue detail view~~: Side panel (slides from right) ✓
- ~~Quick-add~~: Inline '+' in columns (desktop) + floating FAB (mobile) ✓
- ~~Search/filter~~: Basic filter bar (assignee, priority, label, title search) ✓
- ~~Test strategy~~: No tests for v1, agent QA scenarios only ✓
- ~~Scope exclusions~~: No comments, no attachments, no notifications, no activity log, no time tracking ✓
- ~~Due dates~~: YES — YYYY-MM-DD with shadcn calendar picker ✓
- ~~Google login~~: REMOVED — email+password only ✓
- ~~Avatars~~: First letter + deterministic color from email hash ✓

## Infrastructure (LIVE)
- **Supabase project**: Toad
- **Org**: snacksncode's Org (FREE)
- **Region**: Central EU (Frankfurt) — eu-central-1 • t4g.nano
- **URL**: https://wdnzqeilwqjuyjeaxjbs.supabase.co
- **Data API**: Enabled
- **Auto RLS**: Disabled (will set up manually per table)
- **Status**: Healthy, no migrations yet

## Scope Boundaries

### INCLUDE (v1)
- Email + password auth (sign up, log in, log out)
- Multi-project boards (create, rename, delete boards)
- Customizable columns per board (create, rename, reorder, delete)
- Issue CRUD (title, description, priority, labels, assignee, due date)
- Drag-and-drop between columns (dndkit)
- Side panel for issue detail/editing
- Quick-add: inline in columns + floating button for mobile
- Basic filter bar (assignee, priority, label, title search)
- Theme picker gallery (10-15 tweakcn presets) + dark/light toggle
- Responsive design (mobile-friendly, not PWA)
- Email-based collaboration (add email to project, auto-appears on signup)
- Avatars: computed from email (first letter + color)
- RLS on all Supabase tables

### EXCLUDE (v1)
- Google/OAuth login
- Comments/discussion on issues
- File attachments
- Push/email notifications
- Activity log / audit trail
- Time tracking / estimates
- Realtime sync (manual refresh)
- Offline mode / PWA
- Automated tests (agent QA only)
