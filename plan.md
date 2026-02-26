# Multi-Tenant Organizations, Enhanced Analytics & Email Builder — Progress

## Status: Phase 9 Complete (AI Intelligence Layer)

---

## Completed

### Phase 9: AI Intelligence Layer (All Done)

#### AI Analysis Engine
- [x] **Database migration** — `supabase/migration-ai.sql` (ai_summary, ai_category, ai_tags, ai_sentiment, ai_processed_at columns on emails)
- [x] **OpenAI SDK** — `openai` npm package, GPT-4o-mini model for cost-effective analysis (~$0.00027/email)
- [x] **AI client** — `src/lib/ai/client.ts` with `analyzeEmail()` function (structured JSON output, 3000-char body truncation, graceful null on failure)
- [x] **Processor integration** — `src/lib/gmail/processor.ts` calls AI after email insert (try/catch wrapped, never blocks ingestion)
- [x] **Graceful degradation** — AI skipped entirely if `OPENAI_API_KEY` not set

#### AI APIs
- [x] **Email detail API** — `src/app/api/emails/[id]/route.ts` returns aiSummary, aiCategory, aiTags, aiSentiment, aiProcessedAt
- [x] **Email list API** — `src/app/api/emails/route.ts` returns aiSummary in list response
- [x] **Re-analyze endpoint** — `src/app/api/emails/[id]/ai/route.ts` (POST, auth + non-VIEWER check)

#### AI UI
- [x] **AI Insights panel** — `src/components/emails/ai-insights.tsx` (collapsible, default open)
  - Summary display, sentiment badge (green/gray/red), suggested category with "Apply" button
  - Suggested tags with "Add" buttons (filters already-applied tags), re-analyze button
- [x] **Email detail page** — AI Insights panel between header and view tabs
- [x] **Email preview (split view)** — AI Insights panel added to `email-preview.tsx`
- [x] **Email list** — AI summary line with sparkle icon below snippet
- [x] **TypeScript types** — AI fields added to `EmailDetail` interface in `src/types/email.ts`

#### Bug Fixes
- [x] **Focus mode state reset** — moved state above Suspense boundary in `emails/page.tsx`
- [x] **Focus mode list still visible** — preview div now shows on all screen sizes when in focus mode
- [x] **Duplicate maximize icons** — changed "Full" width preset icon from Maximize2 to Expand
- [x] **setChromeHidden in render** — moved out of setFocusMode updater function to avoid cross-component setState during render

#### Backfill
- [x] **All 76 emails analyzed** — ran batch analysis with auto-tag creation and linking

---

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

---

## Phase 7: Email Builder & Testing (All Done)

### Database & Types
- [x] **Migration** — `supabase/migration-drafts.sql` (email_drafts, email_snippets, global_styles tables with org-scoped RLS)
- [x] **TypeScript types** — `src/types/draft.ts` (EmailDraft, EmailSnippet, GlobalStyles, DraftBlock, BlockProperties)
- [x] **Zod schemas** — `src/lib/validations/draft.ts` (create/update draft, snippet, styles, transform, test-send)

### API Routes (12 files)
- [x] `POST/GET /api/drafts` — list + create drafts
- [x] `GET/PATCH/DELETE /api/drafts/[id]` — CRUD single draft
- [x] `POST /api/drafts/[id]/duplicate` — clone a draft
- [x] `POST /api/drafts/[id]/transform` — CSS inline (juice), minify (html-minifier-terser), clean CSS, UTM params
- [x] `POST /api/drafts/[id]/test-send` — send test email via nodemailer SMTP
- [x] `GET /api/drafts/[id]/export` — download as HTML or ZIP (jszip)
- [x] `POST /api/drafts/[id]/validate` — link, image, accessibility, spam, Gmail clipping checks
- [x] `GET/POST /api/snippets` + `GET/PATCH/DELETE /api/snippets/[id]` — CRUD snippets
- [x] `GET/PUT /api/styles` — get/upsert global styles per org
- [x] `GET /api/templates` — list drafts where is_template=true

### Code Editor & Preview
- [x] **CodeMirror 6 editor** — `code-editor.tsx` with HTML language, syntax highlighting, autocomplete, bracket matching, dark/light themes
- [x] **Live preview** — `live-preview.tsx` with iframe srcDoc, desktop/mobile toggle, dark mode
- [x] **HTML checker** — `html-checker.tsx` client-side lint for deprecated tags, unsupported CSS, missing alt text, file size
- [x] **Editor toolbar** — `editor-toolbar.tsx` with Code/Visual/Preview tabs, format, save status

### Pages & Navigation
- [x] **Drafts list** — `drafts/page.tsx` with search, create, duplicate, delete, template picker
- [x] **Draft editor** — `drafts/[id]/page.tsx` with Code/Visual/Preview tabs, auto-save (2s debounce), Cmd+S, title/subject inputs, right sidebar with transformers + validation
- [x] **Sidebar** — added "Drafts" nav item with PenTool icon

### Visual Drag-and-Drop Editor
- [x] **Visual editor** — `visual-editor.tsx` container wiring palette + canvas + properties
- [x] **Block palette** — `block-palette.tsx` with 8 draggable block types (text, image, button, columns, divider, spacer, header, footer)
- [x] **Block canvas** — `block-canvas.tsx` drop zone with reordering, selection, delete, drop indicators
- [x] **Block properties** — `block-properties.tsx` context-sensitive editors for each block type
- [x] **Block serializer** — `block-serializer.ts` with blocksToHtml(), htmlToBlocks(), table-based email layout

### Templates, Snippets, Global Styles
- [x] **Template picker** — `template-picker.tsx` modal for creating drafts from templates
- [x] **Snippet manager** — `snippet-manager.tsx` CRUD with search + insert into editor
- [x] **Global styles** — `settings/styles/page.tsx` brand colors, fonts, button defaults with live preview

### Testing & QA
- [x] **Test send dialog** — `test-send-dialog.tsx` multi-recipient, custom subject, SMTP via nodemailer
- [x] **Validation panel** — `validation-panel.tsx` expandable results for links, images, accessibility, spam score, Gmail clipping

### Export & Transformers
- [x] **Transformer panel** — `transformer-panel.tsx` toggle CSS inline/minify/clean CSS/UTM params with file size display
- [x] **Export menu** — `export-menu.tsx` copy HTML, download HTML, download ZIP

### NPM Packages Added
- `codemirror`, `@codemirror/lang-html`, `@codemirror/state`, `@codemirror/view`
- `juice`, `html-minifier-terser`, `clean-css`, `nodemailer`, `jszip`
- `@types/nodemailer`, `@types/clean-css`, `@types/html-minifier-terser`

---

### Phase 8: Cron Monitor & Gmail Sync Fix (All Done)

#### Cron Monitor Dashboard
- [x] **Migration** — `supabase/migration-cron.sql` (cron_runs, cron_settings tables with org-scoped RLS)
- [x] **Cron utilities** — `src/lib/utils/cron.ts` (`describeCron()`, `getNextRun()` — no npm deps)
- [x] **Run logging** — `src/app/api/cron/ingest/route.ts` wraps `processNewEmails()` with cron_runs tracking (trigger: `cron`)
- [x] **Manual trigger logging** — `src/app/api/ingestion/trigger/route.ts` wraps with cron_runs tracking (trigger: `manual`)
- [x] **Runs API** — `src/app/api/cron/runs/route.ts` (GET — paginated run history + success rate / avg duration stats)
- [x] **Settings API** — `src/app/api/cron/settings/route.ts` (GET/PUT — schedule, enabled, notification prefs)
- [x] **Dashboard page** — `src/app/(dashboard)/cron/page.tsx` (health cards, run history table with status filter + pagination, collapsible settings panel with schedule presets)
- [x] **Sidebar** — added "Cron Monitor" nav item with Timer icon (between Ingestion Log and Settings)

#### Gmail Sync Fix
- [x] **Replaced History API with rolling window** — `src/lib/gmail/poller.ts` now queries Gmail for competitor emails from the last 7 days every run, instead of relying on the unreliable History API. Dedup in processor handles re-fetched emails.
- [x] **Added "skipped" logging** — `src/lib/gmail/processor.ts` now logs `skipped` status with sender address for non-competitor emails (previously silently discarded)

---

## Key Files Reference

| Area | Files |
|------|-------|
| DB Migrations | `supabase/migration-orgs.sql`, `supabase/migration-analytics.sql`, `supabase/migration-drafts.sql` |
| Auth | `src/lib/auth-utils.ts` |
| Org Context | `src/app/(dashboard)/org-context.tsx`, `providers.tsx`, `layout.tsx` |
| Org API | `src/app/api/orgs/route.ts`, `orgs/[orgId]/route.ts`, `orgs/[orgId]/members/`, `orgs/[orgId]/invitations/` |
| Invite | `src/app/api/invitations/accept/route.ts`, `src/app/invite/page.tsx` |
| Team UI | `src/app/(dashboard)/settings/team/page.tsx` |
| Sidebar | `src/components/layout/sidebar.tsx` |
| Analytics | `src/app/api/analytics/*/route.ts`, `src/components/analytics/*.tsx`, `src/app/(dashboard)/analytics/page.tsx` |
| AI Engine | `src/lib/ai/client.ts`, `src/app/api/emails/[id]/ai/route.ts`, `src/components/emails/ai-insights.tsx` |
| AI DB | `supabase/migration-ai.sql` |
| Gmail Sync | `src/lib/gmail/processor.ts`, `src/lib/gmail/poller.ts` |
| Cron Monitor | `src/app/(dashboard)/cron/page.tsx`, `src/app/api/cron/runs/route.ts`, `src/app/api/cron/settings/route.ts`, `src/lib/utils/cron.ts` |
| Cron DB | `supabase/migration-cron.sql` |
| Drafts DB | `supabase/migration-drafts.sql` |
| Drafts Types | `src/types/draft.ts`, `src/lib/validations/draft.ts` |
| Drafts API | `src/app/api/drafts/`, `src/app/api/snippets/`, `src/app/api/styles/`, `src/app/api/templates/` |
| Drafts Pages | `src/app/(dashboard)/drafts/page.tsx`, `drafts/[id]/page.tsx` |
| Editor Components | `src/components/editor/*.tsx` |
| Block Serializer | `src/lib/utils/block-serializer.ts` |
| Global Styles | `src/app/(dashboard)/settings/styles/page.tsx` |
