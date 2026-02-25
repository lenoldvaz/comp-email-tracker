# Multi-Tenant Organizations & Enhanced Analytics — Progress

## Status: In Progress (DB Migration Fix)

---

## Completed

### Part B: Enhanced Analytics (All Done)
- [x] **B1. Top Tags Bar Chart** — RPC `analytics_top_tags`, API route `/api/analytics/tags`, integrated into analytics page
- [x] **B2. CSV Export** — API route `/api/emails/export`, export button on email filters + frequency table
- [x] **B3. Send-Time Heatmap** — RPC `analytics_send_times`, API route `/api/analytics/send-times`, component `send-time-heatmap.tsx`, timezone-aware (sends user IANA tz)
- [x] **B4. Subject Line Insights** — RPC `analytics_subject_insights`, API route `/api/analytics/subjects`, component `subject-insights.tsx`
- [x] **B5. Competitor Comparison** — Component `competitor-compare.tsx`, multi-select + overlay chart + stats cards
- [x] **B6. Trends & Alerts** — RPC `analytics_weekly_trends`, API route `/api/analytics/trends`, component `trends-alerts.tsx`, WoW change + alert cards
- [x] **Page-level competitor selector** on analytics page
- [x] **All analytics components** have `Array.isArray()` guards and RPC-first + direct query fallback pattern

### Part A: Multi-Tenant Code (All Done — Awaiting DB Migration)
- [x] **A1. Database Migration** — `supabase/migration-orgs.sql` (fixed recursion with SECURITY DEFINER helper functions)
- [x] **A2. Auth Utils** — `getActiveOrg()`, `requireOrgMember()`, `requireOrgAdmin()` in `src/lib/auth-utils.ts`
- [x] **A3. Org Context & Layout** — `OrgProvider`/`useOrg()` in `org-context.tsx`, wired into `layout.tsx` + `providers.tsx`
- [x] **A4. API Route Org-Scoping** — All API routes accept/require `orgId`:
  - `competitors`, `categories`, `tags` (GET with `?orgId=`, POST with `orgId` in body)
  - `emails/[id]` (PATCH/DELETE check org role)
  - `emails/[id]/tags` (accepts `orgId` for tag creation per org)
  - `settings/users` (scoped to org members)
  - `analytics/*` (RLS auto-scopes)
  - `cron/sync-gmail` (per-org sync)
- [x] **A5. Invite System** — Full API:
  - `POST /api/orgs` — create org (creator = ADMIN)
  - `GET /api/orgs` — list user's orgs
  - `PATCH /api/orgs/[orgId]` — update org name
  - `GET/POST /api/orgs/[orgId]/members` — list/manage members
  - `PATCH/DELETE /api/orgs/[orgId]/members/[userId]` — update role / remove
  - `GET/POST /api/orgs/[orgId]/invitations` — list/create invites
  - `DELETE /api/orgs/[orgId]/invitations/[id]` — revoke
  - `POST /api/invitations/accept` — accept invite with token
- [x] **A6. Team Management UI** — `settings/team/page.tsx`:
  - Members table with role dropdowns
  - Pending invitations table with copy link / revoke
  - Inline invite form (email + role picker)
  - Org creation form when no org exists
- [x] **Invite page** — `app/invite/page.tsx` (public route, validates token, auto-joins or redirects to register)
- [x] **Register flow** — accepts `invite` query param, passes token, auto-joins org
- [x] **VIEWER role enforcement** — all mutation endpoints reject VIEWER, UI hides edit/delete controls
- [x] **Sidebar** — org switcher dropdown, "New Organization" button, role badge, VIEWER hides admin items
- [x] **Settings/users page** — redirects to `/settings/team`

### Frontend Org-Scoping (All Done)
- [x] `competitors/page.tsx` — `useOrg()`, `orgId` in fetches + POST, role-based controls
- [x] `categories/page.tsx` — same
- [x] `tags/page.tsx` — same
- [x] `email-filters.tsx` — `orgId` in competitor/category fetches
- [x] `tag-input.tsx` — `orgId` in tag search + add-tag POST
- [x] `email-preview.tsx` — `orgId` in categories fetch
- [x] `emails/[id]/page.tsx` — `orgId` in categories fetch
- [x] `analytics/page.tsx` — `orgId` in competitors fetch
- [x] `competitor-compare.tsx` — `orgId` in competitors fetch

### Bug Fixes Applied
- [x] `data.forEach is not a function` — added `Array.isArray()` guards to all analytics components
- [x] Weekly showing months — fixed format to `"MMM d"` for week granularity
- [x] Empty send-time heatmap — added fallback direct queries when RPC functions don't exist
- [x] Timezone on heatmap — sends user IANA timezone, converts server-side
- [x] TypeScript `let formatted` filter type — used separate `const filtered` with explicit type
- [x] RLS infinite recursion on `org_members` — replaced inline subqueries with `SECURITY DEFINER` helper functions

---

## Remaining: Run Database Migrations

The code is complete. The user needs to run two SQL migrations in the Supabase SQL Editor:

### Step 1: Clean up partial migration (if previously attempted)
```sql
DROP FUNCTION IF EXISTS auth_user_org_ids() CASCADE;
DROP FUNCTION IF EXISTS auth_user_admin_org_ids() CASCADE;
DROP FUNCTION IF EXISTS auth_user_write_org_ids() CASCADE;
DROP FUNCTION IF EXISTS org_has_members(text) CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS org_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
ALTER TABLE competitors DROP COLUMN IF EXISTS org_id;
ALTER TABLE categories DROP COLUMN IF EXISTS org_id;
ALTER TABLE tags DROP COLUMN IF EXISTS org_id;
ALTER TABLE emails DROP COLUMN IF EXISTS org_id;
ALTER TABLE ingestion_logs DROP COLUMN IF EXISTS org_id;
ALTER TABLE gmail_sync_state DROP COLUMN IF EXISTS org_id;
```

### Step 2: Run `supabase/migration-orgs.sql`
Creates organizations, org_members, invitations tables + SECURITY DEFINER helpers + org-scoped RLS policies + backfills existing data.

### Step 3: Run `supabase/migration-analytics.sql`
Creates RPC functions: `analytics_top_tags`, `analytics_send_times`, `analytics_subject_insights`, `analytics_weekly_trends`.

---

## Key Files Reference

| Area | Files |
|------|-------|
| DB Migrations | `supabase/migration-orgs.sql`, `supabase/migration-analytics.sql` |
| Auth | `src/lib/auth-utils.ts` |
| Org Context | `src/app/(dashboard)/org-context.tsx`, `providers.tsx`, `layout.tsx` |
| Org API | `src/app/api/orgs/route.ts`, `orgs/[orgId]/route.ts`, `orgs/[orgId]/members/`, `orgs/[orgId]/invitations/` |
| Invite | `src/app/api/invitations/accept/route.ts`, `src/app/invite/page.tsx` |
| Team UI | `src/app/(dashboard)/settings/team/page.tsx` |
| Sidebar | `src/components/layout/sidebar.tsx` |
| Analytics | `src/app/api/analytics/*/route.ts`, `src/components/analytics/*.tsx`, `src/app/(dashboard)/analytics/page.tsx` |
| Gmail Sync | `src/lib/gmail/processor.ts` |
