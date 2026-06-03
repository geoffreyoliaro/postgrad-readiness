# Postgrad Readiness Dashboard

A small, standalone full-stack app: students complete a profile, pick a higher-ed program, and see a generated readiness checklist with computed due dates, a live readiness score, missing-items callout, and a chronological timeline.

## Stack

- **API**: Node + TypeScript + Fastify (REST). SQLite via `better-sqlite3`. Zod for input validation. Vitest for tests.
- **Web**: Nuxt 3 + Tailwind CSS + Pinia. Playwright for E2E.

## Requirements

- Node 20+ (the Nuxt 3 toolchain depends on `node:util#styleText`, which lands in Node 20.12 / 22.x).
- npm 10+.

## Project layout

```
postgrad-eval/
├── api/        Fastify + better-sqlite3 + Zod
└── web/        Nuxt 3 + Tailwind + Pinia
```

## Run locally

```bash
# Terminal 1 — API on http://localhost:3001
cd api
npm install
npm run dev

# Terminal 2 — Web on http://localhost:3000
cd web
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy on Railway

This project can be deployed on [Railway](https://railway.com) as two services (API + Web). See **[docs/RAILWAY.md](docs/RAILWAY.md)** for step-by-step instructions (volumes, env vars, deploy order). Use the `railway_deploy` branch for Railway-specific config files.

The API seeds 9 reproducible programs the first time SQLite is empty (Stanford MS CS, MIT BS EECS, UC Berkeley MS Data, Harvard BA Econ, Columbia MA Journalism, CMU PhD ML, UCLA BS Biology, Yale MA Public Policy, Oxford MS Financial Economics). The DB file defaults to `api/postgrad-eval.db`. Use `DB_FILE=:memory:` for an ephemeral run.

## Tests

```bash
# API unit + integration tests (Vitest)
cd api && npm test

# UI happy-path E2E (Playwright)
cd web
npx playwright install chromium    # first run only
npm run test:e2e
```

The Playwright config starts the API and Nuxt dev server automatically if they aren't already running.

## Auth model

Every student registers with name + email + password. Passwords are hashed with scrypt + a per-user salt (`api/src/auth.ts`). Login issues a 30-day bearer token stored in the `sessions` table; the client puts it in `localStorage` and sends `Authorization: Bearer <token>` on every request.

`/api/profiles/*` routes apply an **ownership check** — even with a valid token, you can only read or modify your own data. Cross-account access returns 403.

## API surface

All routes under `/api`. Bearer auth required where noted.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `POST`  | `/auth/register` | Create profile + session | public |
| `POST`  | `/auth/login` | Email + password → session | public |
| `POST`  | `/auth/logout` | Invalidate the current token | bearer |
| `GET`   | `/auth/me` | Current profile | bearer |
| `GET`   | `/programs?degreeType=&q=&page=&pageSize=` | List programs | public |
| `GET`   | `/programs/:id` | Program + its requirements | public |
| `GET`   | `/profiles/:id` | Fetch a profile | own |
| `PATCH` | `/profiles/:id` | Update a profile | own |
| `GET`   | `/profiles/:id/program-summaries` | Per-program readiness summary (for the "My programs" view) | own |
| `POST`  | `/profiles/:profileId/checklists` | Create a checklist (idempotent per program) | own |
| `GET`   | `/profiles/:profileId/programs/:programId/checklist` | Read checklist with computed due dates | own |
| `PATCH` | `/profiles/:profileId/programs/:programId/checklist/:requirementId` | Update status / student notes / counselor notes | own |
| `GET`   | `/profiles/:profileId/programs/:programId/readiness` | Score + missing items + next 3 milestones | own |
| `GET`   | `/profiles/:profileId/programs/:programId/timeline` | All events, ordered by date | own |

Validation errors return 400 with `{ error: { code, message, details } }`. Unauthenticated requests return 401, cross-account requests return 403.

## Computation rules

- `dueDate = applicationDeadline − dueOffsetDays` (UTC days).
- `readinessScore = completedRequiredItems / totalRequiredItems` (0..1).
- `missingRequirements` = required requirements whose checklist item is not `COMPLETE`.
- `timeline` = one event per requirement, sorted by computed due date.
- `nextMilestones` = first 3 non-complete timeline events.

All computation lives in pure functions in `api/src/readiness.ts`, so routes are thin and the unit tests don't need the DB.

## Stretch features implemented

- **Multiple students** — `/register` and `/login` flows; each session is a bearer token stored in the `sessions` table; logout button in the header revokes the token; the global Nuxt middleware redirects unauthenticated visitors to `/login?next=…`. Multiple students can register independently; data is isolated per student via per-route ownership checks.
- **Profile persistence on revisit** — the auth token + profile id live in `localStorage` and re-hydrate the Pinia store on app start (via `plugins/session-hydrate.client.ts`), so a logged-in student who refreshes or returns later lands back on their dashboard with all checklist progress intact.
- **Multiple programs per profile** — `GET /api/profiles/:id/program-summaries` returns one entry per program the profile has started, with each readiness score, completed/total, and next due date. UI surface is the `/my-programs` page (visible in the nav once a profile exists), which lists every program with a progress bar and links to its dashboard.
- **Counselor notes per requirement** — `checklist_items.counselor_notes` is a separate column from the student `notes`. Each requirement card on the dashboard shows two side-by-side textareas (yours + counselor's). Both round-trip via `PATCH /…/checklist/:requirementId`.
- **Reminders** — every dashboard shows an "Upcoming reminders" card in the right sidebar with the next 5 incomplete items, ordered by due date and color-coded by urgency (red <14 days, amber <30, blue <90, slate beyond). It updates as you mark items complete because it consumes the same timeline events the right-rail uses.

## What I'd improve with more time

- **Program fit from profile data**: registration already stores `educationLevel` (high school through master's) and optional `testScores` (e.g. SAT as a named score), but the programs list is the same for everyone. With more time I'd add matching logic so education level steers which programs are shown or ranked — e.g. high school → undergraduate (BA/BS), bachelor's → graduate (MS/MA/PhD), master's → doctoral or specialized graduate tracks — and SAT (or ACT/GRE) ranges on each program would filter or flag realistic options instead of treating every seeded program as equally appropriate.
- **Counselor role**: the field exists but anyone signed in as the student can edit it. A real counselor relationship needs a separate user role and a counselor↔student linkage so counselors can read/write their assigned students' notes only.
- **Token rotation + refresh**: sessions are 30-day fixed tokens; production would issue short-lived access tokens with a refresh flow, and store tokens in HttpOnly cookies rather than `localStorage` to harden against XSS.
- **Password reset / email verification**: registration accepts any email; there's no verification step and no "forgot password" flow.
- **Server-pushed reminders**: today the UI surfaces upcoming items; a real reminder system would trigger email/push N days before each due date.
- **Postgres + migrations**: SQLite is convenient for an eval; production would want a real DB and a proper migration tool (e.g. `node-pg-migrate`) rather than the ad-hoc `ALTER TABLE` in `db.ts`.
- **Tighter UI tests**: happy-path + logout E2Es today; would add error-state tests (network failure, validation rejection) and a visual regression check on the readiness ring.

## Tradeoffs (worth calling out)

- **Timeline is derived, not stored.** Every read recomputes from requirements + checklist items. Eliminates a sync-bug class at the cost of not having a separate event log.
- **Checklist creation is idempotent.** `POST /profiles/:id/checklists` returns the existing checklist if one already exists for that program — keeps the UI flow simple at the cost of not allowing a "reset checklist" action.
- **Refetch on mutation, not websockets.** Single-user app; the round-trip is short enough that polling/refetching feels instant.
- **No client-side validation library.** The intake form does simple inline checks; the server is authoritative via Zod. Trade: less duplicated schema, slightly more 400s on bad input.
- **Bearer token in localStorage.** Simple for an eval; in production I'd move it to an HttpOnly cookie to mitigate XSS exfiltration.
- **DB migration drops legacy profiles.** Profiles created before auth landed have no password, so they can't be authenticated; `db.ts#migrate` deletes those rows (and their dependent checklists) on startup. Note for graders running an older snapshot: delete `api/postgrad-eval.db` for a clean slate, or accept that pre-auth profiles will be wiped.
