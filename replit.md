# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Wouter (routing), TanStack Query, framer-motion, Tailwind CSS

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── icc-manager/        # ICC Procedural Manager (React + Vite frontend)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## ICC Procedural Manager

A professional web app for managing ICC international arbitration cases.

### Features

- **Case List** (landing page): Card grid showing all cases with reference, name, parties, and status badge
- **New Case Form** (`/cases/new`): Create cases with all procedural fields
- **Case Dashboard** (`/cases/:id`): Six-tab dashboard — Case Details, Tribunal, Representatives, Procedural Orders, Procedural Calendar, Hearing Logistics

### Hearing Logistics Tab

- Multiple hearings per case (e.g. Jurisdiction + Merits); hearing selector pill tabs at top
- **Hearing Details**: Type (Merits/Jurisdiction/Quantum/Procedural), start/end dates, daily start/end time, timezone of record, location (physical or virtual), platform (Zoom/Teams/Arbitration Place/Other)
- **Participant Schedule**: Name, Role (from a curated ICC arbitration role list), Timezone, Attendance (In Person/Remote), Days Attending (checkboxes per hearing day); full edit/delete
- **Time Zone Grid**: Auto-computed table showing session start/end times in each participant's local timezone using `Intl.DateTimeFormat`. Flags participants outside 07:00–22:00 local time with ⚠️ Unsociable hours warning
- **Witness/Expert Schedule**: Timetable grouped by hearing day; per-entry: Name, Role (Witness/Expert), Examination-in-Chief duration, Cross-Examination duration, Total time, Examining Counsel, Notes
- **Preparation Checklist**: 15 ICC-standard items auto-seeded on hearing creation; toggle Done/Undone with auto-date; notes expander per item; custom items can be added and deleted; progress bar with 100% completion celebration
- DB tables: `hearings`, `hearing_participants`, `witness_schedule`, `hearing_checklist`
- API routes: hearings at `/api/cases/:caseId/hearings`, sub-resources at `/api/hearings/:hearingId/participants|witness-schedule|checklist`
- Date coercion: `coerceHearingDates()` converts ISO date strings to Date objects before Zod parse, `flattenHearingBody()` converts back to ISO strings for DB text columns

### Procedural Orders Tab

- Auto-sequential PO numbering (PO1, PO2, ...) based on existing count
- Summary stat cards: Total Orders, Last Issued date, Not Yet Finalized (amber alert)
- Per-PO card showing PO number badge, issue date, key directions summary, finalized/draft status
- **Draft PO feature**: paste raw tribunal directions line-by-line → auto-formatted preview with numbered paragraphs, "IT IS HEREBY ORDERED" header, and tribunal signature block
- **Apply to Deadlines** workflow: after issuing a PO, prompted to select which existing deadlines are modified; sets new dates, marks them "Extended per [PO number]", preserves original dates
- Edit and delete POs; Update Deadlines action available on each card

### Procedural Calendar Tab

- Tracks all procedural deadlines with description, responsible party (Claimant/Respondent/Tribunal/All), due date, status (Pending/Completed/Extended), PO reference, extension PO, and notes
- Color coding: red = overdue, orange = due in ≤7 days, yellow = due in ≤14 days, green = future
- Summary stat cards: Pending, Overdue, Completed counts
- Timeline view (default) and Table view (sortable columns) toggle
- "Add ICC Standard Deadlines" generates 8 standard ICC arbitration milestones (Answer to Request, CMC, Terms of Reference, memorials, hearing, etc.)
- Add/Edit deadline modal with Extended status prompting an extension PO reference
- One-click complete/reopen (CheckCircle2 toggle) and delete (with confirm)

### Costs Tracker Tab (7th tab)

- **Team Rate Card**: define team members with name, role, hourly rate, currency, party (Claimant/Respondent). Edit and remove members.
- **Time Entries**: log time by date, hours, phase (8-item dropdown), description; linked to rate card member for automatic cost calculation. Phase filter and running totals shown.
- **Disbursements**: log non-time costs with category (7-item: Travel, Expert Fees, Translation, Tribunal Fees, ICC Administrative Costs, Courier, Other), amount, currency, date, description, document reference, and party.
- **ICC Advance on Costs**: record ICC advance amount, claimant/respondent payments, total budget. Auto-flags parties behind on payment (paid < advance/2). Balance outstanding displayed.
- **Costs Summary**: stat cards (time costs, disbursements, grand total, % of budget), budget progress bar, recharts BarChart by phase, per-member bar breakdown, Claimant/Respondent side cards, ICC advance panel.
- **Generate Costs Statement**: opens a printable HTML document in a new tab with PART I (time entries by phase), PART II (disbursements), grand total summary, team rate card annexure, and a print button.

### Database Schema

PostgreSQL tables via Drizzle ORM:

- `cases` — core case fields (reference, name, parties, seat, language, rules, date, currency, status)
- `tribunal_members` — arbitrators linked to a case (name, role, email, timezone)
- `representatives` — party representatives linked to a case (name, firm, role, party, email, timezone)
- `deadlines` — procedural deadlines linked to a case (description, responsible party, due date, original due date, status, PO refs, notes)
- `procedural_orders` — procedural orders (number, title, date, status, content, categories)
- `hearings` — hearing session details (type, date/time, location, platform, seat, timezone, notes)
- `hearing_participants` / `witness_schedule` / `hearing_checklist` — hearing sub-tables
- `rate_card` — team member hourly rates per case (name, role, hourlyRate, currency, party)
- `time_entries` — time logs per case (date, hours, phase, description, rateCardId FK)
- `disbursements` — non-time costs per case (category, amount, currency, date, description, docRef, party)
- `costs_settings` — per-case ICC advance and budget settings (iccAdvanceAmount, claimantPaid, respondentPaid, totalBudget, budgetCurrency, notes)

### API Endpoints (Express, prefixed at `/api`)

- `GET /api/cases` — list all cases
- `POST /api/cases` — create a case
- `GET /api/cases/:id` — get case with tribunal and representatives
- `PUT /api/cases/:id` — update case
- `GET/POST /api/cases/:caseId/tribunal` — manage tribunal members
- `PUT/DELETE /api/cases/:caseId/tribunal/:memberId`
- `GET/POST /api/cases/:caseId/representatives` — manage representatives
- `PUT/DELETE /api/cases/:caseId/representatives/:repId`
- `GET/POST /api/cases/:caseId/deadlines` — manage procedural deadlines
- `PUT/DELETE /api/cases/:caseId/deadlines/:deadlineId`
- `GET/POST /api/cases/:caseId/rate-card` — team rate card
- `PUT/DELETE /api/cases/:caseId/rate-card/:memberId`
- `GET/POST /api/cases/:caseId/time-entries` — time entries
- `PUT/DELETE /api/cases/:caseId/time-entries/:entryId`
- `GET/POST /api/cases/:caseId/disbursements` — disbursements
- `PUT/DELETE /api/cases/:caseId/disbursements/:disbId`
- `GET /api/cases/:caseId/costs-settings` — get costs settings (returns defaults if not set)
- `PUT /api/cases/:caseId/costs-settings` — upsert costs settings

### Important Notes

- Date fields in DB are stored as `text` (ISO string format), but Zod-generated schemas use `zod.date()`. Routes use `coerceDates()` helpers to convert string→Date for Zod validation, then `flattenBody()` helpers to convert Date→string for DB insertion. Response `.parse()` calls are removed from all routes to avoid re-validation of outbound data.

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Database

In development, push schema changes with:
```bash
pnpm --filter @workspace/db run push
```

Run codegen after OpenAPI spec changes:
```bash
pnpm --filter @workspace/api-spec run codegen
```
