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
  passwords, server-side revocable sessions (httpOnly cookies), and a tokenized
  password-reset flow.
- **Buyer list** — store buyers with contact info and a "buy box" (target
  markets, property types, price range).
- **Deals** — post properties with address, numbers (asking, ARV, repairs),
  beds/baths/sqft, description, and an active / archived status.
- **Matching** — a lightweight "Match" signal (market / asset type / price)
  orders the send list; it's a hint, not a scoring engine.
- **Distribution** — pick buyers from a send checklist and give each a private,
  per-recipient deal link. PropFlip records opens and lets the recipient pass,
  express interest, or make an offer — no account required for the buyer.
- **Offer tracking** — buyers submit a dollar offer (with an optional note) on
  their private link; the wholesaler reviews offers per deal and marks each
  *accepted* or *declined*. Pending offers surface on the Deals header.
- **Deal photos** — attach photos to a deal (camera-friendly on mobile).
  Buyers see them on their private link. Files are stored on disk/object
  storage, not in the database, so storage stays cheap.
- **Deals home** — after login you land on Deals, with a thin summary header
  (active deals · pending offers · buyers). There is no separate dashboard.
- **Mobile-first** — responsive layout with a desktop sidebar and a mobile tab
  bar.

### Intentionally out of scope

Per the Product Constitution, the product stays small on purpose. PropFlip
deliberately excludes a marketplace, public listings, buyer network, AI
recommendations, SMS, comping, skip tracing, acquisition tools, accounting,
third-party integrations, a native mobile app (responsive web only), and team
permissions beyond basic owner access. Every feature must help a wholesaler
dispose of a deal faster; if it doesn't, it isn't built.

Email verification is **not** implemented yet (deferred until an email provider
is wired in — gating login on it without delivery would lock users out).

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router, Server Actions) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for the mobile-first UI
- [Prisma](https://www.prisma.io/) ORM with **PostgreSQL**
- `sharp` for image processing (EXIF stripping), `bcryptjs` for password
  hashing, `zod` for input validation
- File storage behind a driver (`local` for dev, `supabase` for production)

## Getting started

Requires a PostgreSQL database (see `.env.example`; for production use Supabase
— [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Configure environment (point DATABASE_URL at your Postgres)
cp .env.example .env

# 3. Apply migrations
npm run db:migrate

# 4. (Optional) Seed a demo account
npm run db:seed
#   email:    demo@propflip.app
#   password: demo1234

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000.

## Tests

```bash
npm test   # node:test + tsx, runs against DATABASE_URL
```

Covers cross-user isolation, photo-access authorization, private-token scoping,
offer submission, and the password-reset flow.

## Project structure

```
prisma/
  schema.prisma        # User, Session, PasswordResetToken, Buyer, Deal,
                       #   DealInterest, DealPhoto, AuditLog
  seed.mjs             # demo data
src/
  actions/             # server actions (auth, buyers, deals, interest)
  app/
    (auth)/            # login / signup / forgot- + reset-password
    (app)/             # authenticated shell: deals (home), buyers
    d/[token]/         # public, per-recipient deal page (no auth)
    api/
      deals/[id]/photos/  # POST: authorized multipart photo upload
      photos/[id]/        # GET: authorized photo serving (owner or token)
  components/          # UI building blocks
  lib/
    auth.ts            # sessions, password hashing, requireUser()
    prisma.ts          # Prisma client singleton
    matching.ts        # lightweight buyer<->deal match signal
    rate-limit.ts      # per-IP rate limiting
    audit.ts           # append-only audit logging
    storage.ts         # storage driver (local | supabase)
    images.ts          # EXIF stripping + downscale (sharp)
    email.ts           # email sender (Resend or console)
    http.ts            # same-origin (CSRF) check for route handlers
    uploads.ts         # upload limits + magic-byte image validation
    validation.ts      # zod schemas
    format.ts          # formatting helpers
    services/          # isolated DB logic (interest, photos, passwordReset)
tests/                 # node:test isolation/auth/offer/reset tests
docs/DEPLOYMENT.md     # Supabase Postgres + Storage migration checklist
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
- **Password reset.** Tokenized and single-use; only the token hash is stored,
  it expires in 1 hour, and consuming it revokes all of the user's sessions.
- **Rate limiting.** Authentication (login / signup / reset) and the public
  offer/response endpoints are rate-limited per client IP.
- **Audit logging.** Security- and data-relevant events (logins, failed logins,
  signups, password resets, buyer/deal create-update-delete, sends, offers, and
  photo uploads/deletes) are written to an append-only `AuditLog`.
- **Secure uploads.** Deal photos are validated by magic bytes (not the
  client's filename/type), **re-encoded with EXIF/GPS metadata stripped** and
  downscaled, capped in size (5 MB) and count (12 per deal), stored under random
  keys (no path traversal), and served only to the owner or a holder of the
  deal's private token. The upload route enforces a same-origin check. Image
  bytes live in file/object storage — the DB keeps only small metadata rows.
- **Public deal links.** The only unauthenticated surface is `/d/[token]`. The
  token is 24 random bytes and grants access to exactly one deal's shared
  details for one recipient — nothing else about the account.
- **Headers.** A `Content-Security-Policy`, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, a `Referrer-Policy`, and a restrictive
  `Permissions-Policy` are sent on every response; `X-Powered-By` is disabled.

## Production deployment

PropFlip targets **PostgreSQL + Supabase Storage**. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full migration checklist.

## Available scripts

| Script               | Description                     |
| -------------------- | ------------------------------- |
| `npm run dev`        | Start the dev server            |
| `npm run build`      | Production build                |
| `npm run start`      | Start the production server     |
| `npm run lint`       | Run ESLint                      |
| `npm test`           | Run the test suite              |
| `npm run db:migrate` | Create/apply migrations (dev)   |
| `npm run db:deploy`  | Apply migrations (production)   |
| `npm run db:seed`    | Seed the demo account           |
