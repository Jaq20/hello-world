# PropFlip — Deployment & Supabase Migration Checklist

PropFlip runs on **PostgreSQL** + an **object/file store**. All database access
is behind Prisma (`src/lib/prisma.ts` + `src/lib/services/*`), and all blob I/O
is behind one module (`src/lib/storage.ts`), so moving environments is a config
change, not a code change.

## 1. Database (Supabase Postgres)

1. Create a Supabase project. In **Project Settings → Database**, copy:
   - **Connection pooling** string (port `6543`) → app runtime `DATABASE_URL`.
   - **Direct connection** string (port `5432`) → use for migrations.
2. Set `DATABASE_URL` in your host's environment (do **not** commit it).
3. Apply the schema:
   ```bash
   DATABASE_URL="<direct-5432-url>" npx prisma migrate deploy
   ```
4. (Optional) seed a demo account: `npm run db:seed`.

No schema changes are needed — the Prisma `datasource` is already `postgresql`.

## 2. File storage (Supabase Storage)

1. In **Storage**, create a **private** bucket named `deal-photos`
   (or any name; set it below). Do **not** make it public.
2. Set environment variables:
   ```
   STORAGE_DRIVER=supabase
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # secret, server-only
   SUPABASE_STORAGE_BUCKET=deal-photos
   ```
3. That's it — `src/lib/storage.ts` routes `save`/`read`/`remove` to Supabase
   Storage. Photos are always served back through the app's authorized
   `/api/photos/[id]` route (owner session or private deal token); the bucket
   itself stays private and is never linked publicly.

## 3. Email (password reset)

- Set `RESEND_API_KEY` and `EMAIL_FROM` to send real reset emails.
- If unset, reset links are logged to the server console (fine for local/dev).

## 4. App config

- `NODE_ENV=production` (enables Secure cookies + strict CSP).
- Run `npm run build` then `npm run start` (or deploy to your platform).

## 5. Verify after deploy

- [ ] Sign up, log out, log back in.
- [ ] Create a deal, upload a photo (confirm it displays).
- [ ] Send the deal to a buyer; open the private link in a private window.
- [ ] Submit an offer; confirm it appears on the deal and on the Deals header.
- [ ] Request a password reset; confirm the email/console link works.
- [ ] `curl -I` the site and confirm `Content-Security-Policy` is present.

## Notes / future hardening

- The in-memory rate limiter (`src/lib/rate-limit.ts`) is per-instance. If you
  run more than one instance, back it with Redis or a Postgres table.
- Add a scheduled job to purge expired `Session` and `PasswordResetToken` rows.
- Email verification is not yet implemented (see README).
