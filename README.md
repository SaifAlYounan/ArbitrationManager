# Arbitration Manager

> *An ICC arbitration case management tool built by a practitioner, for practitioners. Free. Open source.*

**Live app**: [replit.com/@alexiosvdsk/Arbitration-Case-Manager](https://replit.com/@alexiosvdsk/Arbitration-Case-Manager)

---

## The Problem

International arbitration case management is routinely handled through a combination of email folders, shared spreadsheets, and institutional memory. Deadline tracking lives in Outlook. Exhibit registers live in Excel. Costs are tracked in a separate file that doesn't talk to the time log. Hearing logistics — participant timezones, witness schedules, preparation checklists — exist wherever they were last touched.

The tools that do exist are expensive, enterprise-only, and built by software teams who have never read a Procedural Order.

This is an attempt to fix that.

---

## What It Is

A full-stack web application for managing ICC international arbitration cases end-to-end. It covers the full procedural lifecycle: from case creation through tribunal constitution, exhibit registration, procedural orders, hearing logistics, costs tracking, and deadline management — all in one place, with the ICC Rules baked in.

It was built during Paris Arbitration Week 2025 and released as a free, open-source tool.

---

## Features

### Case Dashboard

Each case gets a dedicated dashboard with a navy sidebar and seven functional tabs. Three sample cases are pre-seeded at different stages of the ICC procedure (early, mid, late) to let you explore the full feature set immediately.

### Procedural Calendar

Track every deadline with description, responsible party (Claimant / Respondent / Tribunal / All), due date, status, and PO reference. Colour-coded urgency: overdue in red, ≤7 days in orange, ≤14 days in yellow. Timeline and table views. One-click ICC standard deadline generation populates the 8 canonical ICC milestones automatically.

### Exhibits

Auto-sequential exhibit numbering following ICC convention (C-001, C-002... / R-001, R-002...). Party and status filters. Register, edit, and delete. Status categories: Filed, Pending, Agreed, Disputed.

### Procedural Orders

Auto-sequential PO numbering. Per-PO status (finalized / draft). **Draft PO feature**: paste raw tribunal directions line-by-line and get an auto-formatted preview with numbered paragraphs, an "IT IS HEREBY ORDERED" header, and a tribunal signature block. **Apply to Deadlines** workflow: after issuing a PO, select which deadlines are modified, update their dates, and mark them "Extended per [PO number]" — preserving the original date for the record.

### Hearing Logistics

Multiple hearings per case (e.g. Jurisdiction + Merits) with pill-tab navigation. For each hearing:

- **Hearing Details**: type, dates, daily times, timezone of record, location (physical or virtual), platform (Zoom / Teams / Arbitration Place / Other)
- **Participant Schedule**: name, role (ICC arbitration role list), timezone, attendance mode (in person / remote), days attending
- **Time Zone Grid**: auto-computed table showing session start/end in each participant's local timezone. Flags participants outside 07:00–22:00 with a ⚠️ *Unsociable hours* warning
- **Witness & Expert Schedule**: timetable by hearing day — examination-in-chief duration, cross-examination, examining counsel, notes
- **Preparation Checklist**: 15 ICC-standard checklist items, auto-seeded on hearing creation. Toggle done/undone with auto-date. Custom items. Progress bar with completion indicator.

### Costs Tracker

Full costs management from rate card to printable statement:

- **Team Rate Card**: name, role, hourly rate, currency, party (Claimant / Respondent)
- **Time Entries**: date, hours, phase (8 ICC phases), description; linked to rate card for automatic cost calculation
- **Disbursements**: category (Travel, Expert Fees, Translation, Tribunal Fees, ICC Administrative Costs, Courier, Other), amount, currency, date, document reference, party
- **ICC Advance on Costs**: record advance amount and claimant/respondent payments. Auto-flags parties behind on payment. Balance outstanding displayed.
- **Costs Summary**: stat cards, budget progress bar, phase breakdown chart (recharts), per-member breakdown, party-side totals
- **Generate Costs Statement**: opens a printable HTML document — PART I (time entries by phase), PART II (disbursements), grand total, team rate card annexure

### Settings

Consolidated tab covering case details, tribunal constitution, party representatives, budget & costs configuration, and reminder preferences — all in one place.

### Global Search

Command-palette search (⌘K) across all deadlines, exhibits, procedural orders, and time entries for a case.

---

## Architecture

```
arbitration-manager/
├── artifacts/
│   ├── api-server/         # Express 5 API — all routes, Zod validation
│   └── icc-manager/        # React + Vite frontend
├── lib/
│   ├── api-spec/           # OpenAPI 3.1 spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas
│   └── db/                 # Drizzle ORM schema + PostgreSQL connection
└── scripts/                # Utility scripts
```

### Database Schema (PostgreSQL via Drizzle ORM)

`cases` · `tribunal_members` · `representatives` · `deadlines` · `procedural_orders` · `hearings` · `hearing_participants` · `witness_schedule` · `hearing_checklist` · `rate_card` · `time_entries` · `disbursements` · `costs_settings` · `exhibits` · `case_preferences`

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4 + drizzle-zod |
| API Contract | OpenAPI 3.1 + Orval codegen |
| Frontend | React + Vite |
| Routing | Wouter |
| Data Fetching | TanStack Query |
| Animation | Framer Motion |
| Styling | Tailwind CSS |
| Build | esbuild (CJS bundle) |
| Package Manager | pnpm workspaces |

---

## Getting Started

### Prerequisites

- Node.js ≥ 24
- pnpm
- PostgreSQL (or a `DATABASE_URL` connection string)

### Install

```bash
git clone https://github.com/SaifAlYounan/ArbitrationManager.git
cd ArbitrationManager
pnpm install
```

### Database Setup

```bash
pnpm --filter @workspace/db run push
```

### Development

```bash
# API server
pnpm --filter @workspace/api-server run dev

# Frontend
pnpm --filter @workspace/icc-manager run dev
```

### Build

```bash
pnpm run build
```

### Typecheck

```bash
pnpm run typecheck
```

---

## API Reference

All routes prefixed at `/api`. Key endpoints:

```
GET  /api/cases                                  # List all cases
POST /api/cases                                  # Create case
GET  /api/cases/:id                              # Case + tribunal + reps
PUT  /api/cases/:id                              # Update case

GET|POST   /api/cases/:id/deadlines              # Procedural calendar
GET|POST   /api/cases/:id/procedural-orders      # Procedural orders
GET|POST   /api/cases/:id/exhibits               # Exhibit register
GET|POST   /api/cases/:id/hearings               # Hearings
GET|POST   /api/hearings/:id/participants        # Hearing participants
GET|POST   /api/hearings/:id/witness-schedule    # Witness timetable
GET|POST   /api/hearings/:id/checklist           # Preparation checklist

GET|POST   /api/cases/:id/rate-card              # Team rate card
GET|POST   /api/cases/:id/time-entries           # Time log
GET|POST   /api/cases/:id/disbursements          # Disbursements
GET|PUT    /api/cases/:id/costs-settings         # ICC advance & budget

GET        /api/cases/:id/activity               # Activity feed (last 10)
GET        /api/cases/:id/search?q=              # Global search
```

---

## Context

Built at **Paris Arbitration Week 2025** and open-sourced immediately. The design intent was simple: a practitioner should be able to open a new case, populate a tribunal, load ICC standard deadlines, and have a working case management environment in under ten minutes — without a subscription, a sales call, or an enterprise IT department.

The ICC procedure is opinionated. The tool reflects that. Standard deadline templates follow the ICC Rules. Exhibit numbering follows ICC convention. The costs tracker understands the Advance on Costs mechanism. None of this requires configuration.

---

## License

MIT

---

## Author

Alexios van der Slikke-Kirillov
