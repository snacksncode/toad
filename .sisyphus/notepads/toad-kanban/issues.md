# Issues & Gotchas — toad-kanban

## Known Risks
- dnd-kit Safari regression: v0.3.x has drag offset bug on Safari (#1910). Test in Chrome. If Safari broken, note but don't block.
- TanStack Router #6455: Hydration bug on direct navigation. Root shell must render without server data.
- TanStack Start SPA shell path: Vercel rewrites must target `/_shell.html`, not `/`

## RLS Gotchas
- SELECT/UPDATE/DELETE return 0 rows on policy violation (not error). UI must handle empty results.
- Auto RLS is DISABLED on Supabase Toad project — must manually enable per table
- All policies: TO authenticated only. No anon policies.
- issues.project_id is denormalized to avoid 2-hop join in RLS

## DnD Notes
- Use @dnd-kit/react (new API), NOT @dnd-kit/core (legacy)
- useSortable with `group` prop (column ID) for cross-column
- useDroppable with `collisionPriority: CollisionPriority.Low` on columns
- State shape MUST be Record<string, string[]> for `move` helper
- onDragOver for state, onDragEnd for persistence
- NO separate TouchSensor — PointerSensor handles all input types
- Add touch-action: none on draggable elements

## shadcn Commands
- `npx shadcn add [component]` to add components
- All components go in src/components/ui/
