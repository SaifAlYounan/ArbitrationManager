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
- **Case Dashboard** (`/cases/:id`): Four-tab dashboard — Case Details, Tribunal, Representatives, Procedural Calendar

### Procedural Calendar Tab

- Tracks all procedural deadlines with description, responsible party (Claimant/Respondent/Tribunal/All), due date, status (Pending/Completed/Extended), PO reference, extension PO, and notes
- Color coding: red = overdue, orange = due in ≤7 days, yellow = due in ≤14 days, green = future
- Summary stat cards: Pending, Overdue, Completed counts
- Timeline view (default) and Table view (sortable columns) toggle
- "Add ICC Standard Deadlines" generates 8 standard ICC arbitration milestones (Answer to Request, CMC, Terms of Reference, memorials, hearing, etc.)
- Add/Edit deadline modal with Extended status prompting an extension PO reference
- One-click complete/reopen (CheckCircle2 toggle) and delete (with confirm)

### Database Schema

Four PostgreSQL tables via Drizzle ORM:

- `cases` — core case fields (reference, name, parties, seat, language, rules, date, currency, status)
- `tribunal_members` — arbitrators linked to a case (name, role, email, timezone)
- `representatives` — party representatives linked to a case (name, firm, role, party, email, timezone)
- `deadlines` — procedural deadlines linked to a case (description, responsible party, due date, original due date, status, PO refs, notes)

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
