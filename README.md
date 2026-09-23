# StudioDesk

A small app for a studio to keep clients, book sessions, and send invoices.It can also fit a shop, a clinic, or online sessions.

The website is Next.js. The API is Express. The database is PostgreSQL, accessed with Prisma. Pages never query the database.

## Try it

https://studiodesk-one.vercel.app

| Login | Password | What you can do |
| --- | --- | --- |
| `owner@demo` | `demo1234` | Everything. Switch between two studios. |
| `manager@demo` | `demo1234` | Clients, bookings, import. Cannot change the plan. |

- **Northshore** is Free. Invoices are hidden.
- **Harbor** is Pro. Invoices are shown.

Same owner, same login. Use the studio menu in the sidebar. Each studio only sees its own clients and bookings.

## What you can do

- Add clients. A client is a name and email, not a login.
- Book a session with a client.
- Paste a CSV, check the rows, save the good ones, or undo that save.
- Turn invoices on for one studio. Free hides them. Pro shows them. The owner can also turn them on for a single studio.
- Sign in with a cookie stored in the database. Log out deletes that login. Switching studios keeps the same login.

Stripe and Google Calendar are optional. With empty keys, Switch to Pro only changes the plan in the database, and Collect payment only marks the invoice paid.

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

Open http://localhost:3000.

## How it is split

| Folder | Job |
| --- | --- |
| `apps/web` | Screens |
| `apps/api` | Login, permissions, clients, bookings, invoices, import |
| `packages/db` | Database tables |

The browser calls `/api` on the website. Next.js forwards that to Express. Express uses Prisma to reach Postgres.
