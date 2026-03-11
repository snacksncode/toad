# Unresolved Problems — toad-kanban

(No blockers yet — project just starting)

## BLOCKER: Supabase Migration Not Applied (2026-03-11)

### Status
All 5 tables (profiles, projects, project_members, columns, issues) do NOT exist in Supabase yet. REST API returns `PGRST205` "Could not find the table" for all.

### Why it can't be applied programmatically
1. **Supabase CLI** (`npx supabase` v2.78.1 available) — requires `supabase login` which needs a personal access token (`sbp_...` format). No `SUPABASE_ACCESS_TOKEN` env var set.
2. **Management API** — requires personal access token (not the publishable/anon key)
3. **Direct DB connection** — no `SUPABASE_DB_PASSWORD` available
4. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (publishable) exist in `.env`

### Manual steps required
1. Go to: **https://supabase.com/dashboard/project/wdnzqeilwqjuyjeaxjbs/sql/new**
2. Paste the entire contents of `supabase/migrations/001_initial_schema.sql` (251 lines)
3. Click **Run**
4. Verify by running:
```bash
for table in profiles projects project_members columns issues; do
  echo -n "$table: "
  curl -s "https://wdnzqeilwqjuyjeaxjbs.supabase.co/rest/v1/$table?select=*&limit=1" \
    -H "apikey: sb_publishable_VPfgl4YhN_4ar1nju9QMVw_x7BUg2eT" \
    -H "Authorization: Bearer sb_publishable_VPfgl4YhN_4ar1nju9QMVw_x7BUg2eT"
  echo
done
```
All should return `[]` (empty array = RLS working correctly).

### Future prevention
Set `SUPABASE_ACCESS_TOKEN` env var with a personal access token to enable CLI-based migrations (`npx supabase db push`).
