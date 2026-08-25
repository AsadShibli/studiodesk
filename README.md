# StudioDesk

A client-operations app for small studios: people you work with, sessions on the calendar, and invoices when you need them. It can also fit a shop, a clinic, or online sessions.

Built as **Next.js** UI, **Express** API, **PostgreSQL** + **Prisma**. The browser never talks to the database.

![Landing](docs/screenshots/landing.png)

## Demo

| | |
| --- | --- |
| App | https://studiodesk-one.vercel.app |
| Owner | `owner@demo` / `demo1234` |
| Manager | `manager@demo` / `demo1234` (cannot change the plan) |
| Studios | **Northshore** (Free) and **Harbor** (Pro) — switch in the sidebar |

![Sign in](docs/screenshots/signin.png)

![Overview with studio switcher](docs/screenshots/app.png)

Switching studios is the feature-flag demo: Invoices is in the menu on Pro, gone on Free. The flag follows the **studio**, not the user.

## What it does

![Studio plan](docs/screenshots/settings.png)

- **Clients** are contacts, not logins. Importing a spreadsheet does not create 500 passwords.
- **Bookings** are sessions, optionally assigned to a teammate.
- **Invoices** exist when the studio’s plan (or an extra) turns them on.
- **Import** checks a CSV first, then you save the good rows or undo the save.

![CSV import](docs/screenshots/import.png)

## Features

- **Clients** — contacts, not logins. A spreadsheet import does not create hundreds of passwords.
- **Bookings** — sessions on the calendar, optionally assigned to a teammate.
- **Invoices** — only when the studio’s plan (or an extra) turns invoicing on. The flag follows the studio, not the user.
- **CSV import** — dry-run first, then save the good rows. Undo is one delete by `importBatchId`.
- **Multi-tenant isolation** — `prismaForOrg(orgId)` injects `orgId` so a missed `WHERE` cannot leak another studio.
- **RBAC + feature flags** — roles are permission lists; plans are flag lists. Routes call `authorize({ permission, flag })`, never `if (role === "admin")`.
- **Sessions in Postgres** — httpOnly cookie stores a session row id. Log out deletes the row. Switching studios does not mint a JWT.
- **Stripe + Google** — optional. Empty keys use a local stand-in. Webhook event ids go in `ProcessedEvent` first so retries are no-ops.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19 |
| API | Express, Zod |
| Database | PostgreSQL + Prisma |
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`) |
| Auth | Session row + httpOnly cookie (not JWT) |
| Billing | Stripe Checkout (optional; local “Switch to Pro” if keys are empty) |
| Calendar | Google Calendar (optional) |
| Deploy | Vercel (same-origin `/api`), Docker Postgres locally |

## How a request works

```
Browser  →  Next.js (pages only)  →  /api/* rewrite  →  Express  →  Prisma  →  Postgres
```

Three folders, three jobs:

| Folder | Job |
| --- | --- |
| `apps/web` | Screens and forms. No SQL. |
| `apps/api` | Login, permissions, billing, import. |
| `packages/db` | Tables and the tenant helper. |

Live demo: [studiodesk-one.vercel.app](https://studiodesk-one.vercel.app). Locally the browser only talks to `localhost:3000`. Next.js forwards `/api/...` to Express on port 4000 (on Vercel, Express runs as `/api` on the same site). Cookies stay first-party, so we do not fight CORS.

### Why the UI never touches the database

If Next.js ran Prisma too, login rules and tenant rules would live in two places. Express is the only door to data. You can call the same API with `curl`. In production the rewrite is just nginx or Caddy doing the same job.

### Why login is a row in Postgres, not a JWT in the browser

Each sign-in creates a `Session` row. The cookie only stores that row’s id (`httpOnly`, so JavaScript cannot read it).

- Log out = delete the row. That device is done.
- Switch studio = update `activeOrgId` on the same row. No new token.
- A stolen JWT in `localStorage` cannot be revoked until it expires. A stolen cookie can: delete the row.

### Why every query gets `orgId` for free

Harbor and Northshore share one database. The dangerous bug is “forgot `WHERE orgId`” and Harbor sees Northshore’s clients.

`prismaForOrg(orgId)` wraps Prisma and **adds `orgId` itself**. A missed filter cannot leak another studio.

See [`packages/db/src/tenant.ts`](packages/db/src/tenant.ts).

### Why routes never ask “are you admin?”

A **role** is only a list of **permissions** (owner, manager, staff, client). A **plan** is only a list of **flags** (invoices on Pro, off on Free). An extra override can turn one flag on for one studio.

Every route asks one question:

```ts
authorize({ permission: "invoice:write", flag: "invoicing" })
```

“Can this person, in this studio, do this — and is the feature on?” Manager has no `billing:manage`, so plan changes return 403. Free has no invoicing flag, so Invoices stays out of the menu.

See [`apps/api/src/lib/authorize.ts`](apps/api/src/lib/authorize.ts).

### Why a client is not a user

A client is a name and email. They get a login only if you invite them. Importing 200 rows from a spreadsheet must not create 200 passwords.

### Why import can be undone

Each save is tagged with an `importBatchId`. Undo is one delete: every row from that batch. Check first (no writes), then save, then undo if it was wrong.

### Why Stripe and Google retries do not double-charge

Those services retry webhooks. We store the event id in `ProcessedEvent` **before** we change the plan or mark an invoice paid. The same id a second time is ignored.

## Run locally

Needs Docker, Node 22, and pnpm 9.

```bash
pnpm install
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- UI: http://localhost:3000
- API: http://localhost:4000/api/health (also `/api/health` on port 3000)

Optional env (see `.env.example`): Stripe Checkout and Google Calendar. Without those keys the app still runs — Switch to Pro and Collect payment have a local stand-in.

## Layout

```
studiodesk/
├── apps/
│   ├── web/                 Next.js App Router (no Prisma)
│   │   ├── app/             landing, login, register, /app/*
│   │   └── pages/api/       Express on Vercel (same-origin /api)
│   └── api/                 Express + Zod
│       ├── src/lib/         authorize, permissions, sessions
│       └── src/routes/      auth, clients, bookings, invoices, import
├── packages/db/
│   ├── prisma/              schema + migrations
│   └── src/                 tenant helper (`prismaForOrg`), seed
├── docs/screenshots/
├── docker-compose.yml       local Postgres
├── .env.example
└── README.md
```
