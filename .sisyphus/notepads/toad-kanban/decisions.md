# Decisions — toad-kanban

## Architectural Decisions
- Auth: Email+password via Supabase Auth (no Google OAuth)
- Collaboration: Add email to project_members, auto-links on signup via trigger
- Avatars: First letter of email + deterministic color hash (no uploads/Gravatar)
- Storage: Supabase Postgres via JS client directly (no ORM)
- DnD: @dnd-kit/react NEW API (not legacy @dnd-kit/core)
- UI: shadcn (official TanStack Start support) + tweakcn themes
- Issue model: title, description, priority (low/med/high), labels (text[]), assignee_email, due_date
- Columns: customizable per board, reorder via up/down buttons (not drag)
- Board nav: Dashboard + sidebar inside board
- Issue detail: Side panel (shadcn Sheet, side="right")
- Quick-add: inline '+' at bottom of columns + floating FAB (mobile only)
- Themes: 10-15 tweakcn presets + dark/light toggle
- No realtime, no offline, no automated tests for v1
- Column deletion blocked when column has issues (ON DELETE RESTRICT FK)
- Default columns on new board: "To Do" (pos 0), "In Progress" (pos 1), "Done" (pos 2)
- issues.project_id is denormalized (for RLS performance, avoids 2-hop joins)
