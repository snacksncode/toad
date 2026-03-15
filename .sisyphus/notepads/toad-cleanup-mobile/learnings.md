# Learnings — toad-cleanup-mobile

## Architecture

- React 19, TanStack Router/Query, Supabase, @dnd-kit/react v0.3.x, Vite + @vitejs/plugin-react
- `queryClient` is a module-level singleton at `src/lib/query-client.ts` (not in router context yet)
- Auth: `src/hooks/use-auth.ts` — currently per-component useState + onAuthStateChange subscription
- Board page: `src/routes/board/$boardId.tsx` — 617 lines, god component with 4 useQuery calls + DnD + mutations
- column_id is already non-nullable in DB (migration done), but types still say `string | null`

## Patterns

- Existing query keys are inline strings e.g. `["boards", boardId, "columns"]`
- `query-keys.ts` exists with unused `boardKeys`/`projectKeys` helpers
- `EMPTY_COLUMNS/EMPTY_ISSUES/EMPTY_MEMBERS` = module-level stable empty defaults (needed for current useQuery)
- DnD: items state + itemsRef + onDragStart/Over/End — official tutorial pattern
- CSS: Tailwind + shadcn/ui, `cn()` utility for conditional classes

## Task 1 Specific

- `src/lib/auth.ts` — entire file dead, never imported
- `src/components/board/create-issue-dialog.tsx` — never imported anywhere, 243 lines dead
- `src/lib/queries/issues.ts:7-16` — `getColumnIssues` export, never imported
- `src/hooks/use-auth.ts:29-41` — handleSignIn/handleSignUp never used
- `"use client"` in: src/components/ui/date-picker.tsx, calendar.tsx, tooltip.tsx, sidebar.tsx

## Task 3 Specific

- Tasks 1 and 3 both touch `use-auth.ts` — Task 3 rewrites it, so if run in parallel, Task 3 agent should just do the full rewrite (which includes removing handleSignIn/handleSignUp)
- Pattern: `queryFn: () => supabase.auth.getUser().then(r => r.data.user)`, `staleTime: Infinity`, `onAuthStateChange` calls `queryClient.setQueryData` to update cache

## Task 4 Specific

- React Compiler package: `babel-plugin-react-compiler` (devDep)
- vite.config.ts uses `@vitejs/plugin-react` — add babel plugins array
- Do NOT add React.memo after installing compiler — it handles it automatically
