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
- **Case Dashboard** (`/cases/:id`): Three-tab dashboard — Case Details, Tribunal, Representatives

### Database Schema

Three PostgreSQL tables via Drizzle ORM:

- `cases` — core case fields (reference, name, parties, seat, language, rules, date, currency, status)
- `tribunal_members` — arbitrators linked to a case (name, role, email, timezone)
- `representatives` — party representatives linked to a case (name, firm, role, party, email, timezone)

### API Endpoints (Express, prefixed at `/api`)

- `GET /api/cases` — list all cases
- `POST /api/cases` — create a case
- `GET /api/cases/:id` — get case with tribunal and representatives
- `PUT /api/cases/:id` — update case
- `GET/POST /api/cases/:caseId/tribunal` — manage tribunal members
- `PUT/DELETE /api/cases/:caseId/tribunal/:memberId`
- `GET/POST /api/cases/:caseId/representatives` — manage representatives
- `PUT/DELETE /api/cases/:caseId/representatives/:repId`

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
