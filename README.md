# PropFlip

A lightweight **disposition workflow app for real estate wholesalers**. PropFlip
helps small wholesalers manage their cash-buyer list, post deals, match buyers
to deals, send private deal links, and track buyer interest — without the bloat
of a full CRM.

This repository is a secure, responsive **SaaS foundation**: authentication,
strict per-user data isolation, a clean mobile-first UI, and a sensible data
model you can build on.

## Features

- **Authentication** — email + password sign-up/sign-in with bcrypt-hashed
  passwords and server-side, revocable sessions (httpOnly cookies).
- **Buyer list** — store buyers with contact info and a "buy box" (target
  markets, property types, price range).
- **Deals** — post properties with address, numbers (asking, ARV, repairs),
  beds/baths/sqft, description, and status (active / pending / sold / archived).
- **Matching** — buyers are ranked against each deal by how well it fits their
  stated criteria.
- **Distribution** — generate a private, per-recipient deal link. PropFlip
  records opens and lets the recipient mark themselves *interested* or *pass* —
  no account required for the buyer.
- **Offer tracking** — buyers can submit a dollar offer (with an optional note)
  on their private link; the wholesaler reviews offers per deal and marks each
  *accepted* or *declined*. Pending offers surface on the dashboard.
- **Deal photos** — attach photos to a deal (camera-friendly on mobile).
  Buyers see them on their private link. Files are stored on disk/object
  storage, not in the database, so storage stays cheap.
- **Dashboard** — pipeline stats (active deals, buyers, interested, pending
  offers) and recent buyer activity at a glance.
- **Mobile-first** — responsive layout with a desktop sidebar and a mobile tab
  bar.

### Intentionally out of scope

Per the Product Constitution, the MVP is exactly seven things: authentication,
buyer management, deal management, buyer matching, deal distribution, offer
tracking, and the dashboard — and nothing else. PropFlip deliberately excludes a
marketplace, public listings, buyer network, AI recommendations, SMS, comping,
skip tracing, acquisition tools, accounting, third-party integrations, a native
mobile app (responsive web only), and team permissions beyond basic owner
access. Every feature must help a wholesaler dispose of a deal faster; if it
doesn't, it isn't built.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router, Server Actions) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for the mobile-first UI
- [Prisma](https://www.prisma.io/) ORM with SQLite (swap to Postgres easily)
- `bcryptjs` for password hashing, `zod` for input validation

## Getting started

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Configure environment
cp .env.example .env

# 3. Create the database and apply migrations
npm run db:migrate

# 4. (Optional) Seed a demo account with sample data
npm run db:seed
#   email:    demo@propflip.app
#   password: demo1234

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000.

## Project structure

```
prisma/
  schema.prisma        # User, Session, Buyer, Deal, DealInterest, DealPhoto, AuditLog
  seed.mjs             # demo data
src/
  actions/             # server actions (auth, buyers, deals, interest)
  app/
    (auth)/            # login / signup (redirects authed users away)
    (app)/             # authenticated shell: dashboard, buyers, deals
    d/[token]/         # public, per-recipient deal page (no auth)
    api/
      deals/[id]/photos/  # POST: authorized multipart photo upload
      photos/[id]/        # GET: authorized photo serving (owner or token)
  components/          # UI building blocks
  lib/
    auth.ts            # sessions, password hashing, requireUser()
    prisma.ts          # Prisma client singleton
    matching.ts        # buyer <-> deal matching/scoring
    rate-limit.ts      # per-IP rate limiting
    audit.ts           # append-only audit logging
    storage.ts         # file storage abstraction (swap for S3/R2)
    uploads.ts         # upload limits + magic-byte image validation
    validation.ts      # zod schemas
    format.ts          # formatting helpers
```

## Security model

- **Data isolation.** Every `Buyer`, `Deal`, and related record carries a
  `userId`. All reads and writes are scoped to the authenticated user (e.g.
  `where: { id, userId }`), so users can never read or mutate another account's
  data. Cross-tenant access returns 404, not an error that confirms existence.
- **Sessions.** The cookie holds a random opaque token; only its SHA-256 hash is
  stored in the database, so a DB leak can't be replayed. Sessions are
  server-side and revocable, with expiry. Cookies are `httpOnly`, `sameSite=lax`,
  and `secure` in production.
- **Passwords.** Hashed with bcrypt (cost 12). Login uses a constant-shape
  comparison and a generic error to avoid user enumeration.
- **Input validation.** All form input is validated server-side with zod.
- **Rate limiting.** Authentication (login/signup) and the public offer/response
  endpoints are rate-limited per client IP to slow brute force and abuse.
- **Audit logging.** Security- and data-relevant events (logins, failed
  logins, signups, buyer/deal create-update-delete, sends, offers, and photo
  uploads/deletes) are written to an append-only `AuditLog`.
- **Secure uploads.** Deal photos are validated by magic bytes (not the
  client's filename/type), capped in size (5 MB) and count (12 per deal),
  stored under random keys (no path traversal), and served only to the owner
  or a holder of the deal's private token. Image bytes live in file/object
  storage — the database keeps only small metadata rows, so storage cost stays
  low. Swap `src/lib/storage.ts` for S3/R2 to scale out.
- **Public deal links.** The only unauthenticated surface is `/d/[token]`. The
  token is 24 random bytes and grants access to exactly one deal's shared
  details for one recipient — nothing else about the account.
- **Headers.** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  a `Referrer-Policy`, and a restrictive `Permissions-Policy` are sent on every
  response; the `X-Powered-By` header is disabled.

## Moving to Postgres

1. In `prisma/schema.prisma`, set `datasource db { provider = "postgresql" }`.
2. Point `DATABASE_URL` at your Postgres instance.
3. Run `npm run db:migrate`.

## Available scripts

| Script               | Description                     |
| -------------------- | ------------------------------- |
| `npm run dev`        | Start the dev server            |
| `npm run build`      | Production build                |
| `npm run start`      | Start the production server     |
| `npm run lint`       | Run ESLint                      |
| `npm run db:migrate` | Create/apply migrations (dev)   |
| `npm run db:deploy`  | Apply migrations (production)   |
| `npm run db:seed`    | Seed the demo account           |
