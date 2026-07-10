# AGENTS.md

## Cursor Cloud specific instructions

Officia is a single **Next.js 15 (App Router) + TypeScript** multi-tenant ERP/AI SaaS app (npm, `package-lock.json`, `.npmrc` sets `legacy-peer-deps=true`). Standard commands live in `package.json` scripts and `README.md`; only the non-obvious cloud caveats are captured here.

### Services

- **Next.js app** — the product (frontend + `/api` routes). Dev: `npm run dev` (Turbopack) on http://localhost:3000. Started via tmux for long-running use, not part of the update script.
- **PostgreSQL** — required primary DB (Drizzle ORM). `docker-compose.yml` documents the intended local DB, but Docker is **not** available in this VM. Instead a native PostgreSQL server is installed and used with the same credentials the app expects (`postgres` / `postgrespassword`, db `officia`, port 5432).

### Per-session startup (dependencies are refreshed by the update script; these are NOT)

1. Start Postgres (the cluster is installed but not auto-started on a fresh VM):
   `sudo pg_ctlcluster 16 main start`
2. `.env.local` (git-ignored) must exist with at least `DATABASE_URL=postgres://postgres:postgrespassword@localhost:5432/officia`, a `PERSONAL_DATA_ENCRYPTION_KEY` of ≥32 chars, and the two `*_CLERK_*` keys (see Clerk note). If it is missing, recreate it from `.env.example`.
3. Apply migrations: `npm run db:migrate`.
4. Run the app: `npm run dev`.

### Non-obvious gotchas

- **Migrations must be run twice on a truly fresh database.** `scripts/run-migrate.mjs` (`npm run db:migrate`) takes a "fresh DB" path that only runs `drizzle-kit migrate` (journal migrations `0000`–`0004`) and then exits, skipping the incremental `ensure*` steps that add later tables/columns (payroll, `tenants.updated_at`, nordigen keys, etc.). On the second run it detects the existing schema and applies those incremental migrations. Run `npm run db:migrate` twice on a new DB (or use `npm run db:push`). Verify with `GET /api/health/app` returning `{"ok": true, "failed": []}`.
- **Clerk is a hard dependency for the UI and all auth-gated features.** `src/app/layout.tsx` wraps everything in `<ClerkProvider>` and `src/middleware.ts` runs `clerkMiddleware` on every route, so an unparseable publishable key makes *every* request (including the public landing page) 500 with "Publishable key not valid." A format-valid but fake `pk_test_`/`sk_test_` pair lets the server boot and render HTML (curl gets 200) and lets the unauthenticated `/api/health/*` endpoints work, but a **real** Clerk instance is required for the browser UI (Clerk's client script redirects to the frontend-API host) and for sign-in/sign-up/dashboard. Provide real `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` (and an E2E test user) to exercise the product end to end.
- **Health endpoints are the quickest liveness/DB check** and are not auth-protected: `GET /api/health/db` (app→Postgres round-trip) and `GET /api/health/app` (validates required tables/columns).
- Most optional integrations (Anthropic, Stripe, Nordigen, Upstash, Cloudinary, Deepgram, Resend, NAP) are off/mockable locally; NAP defaults to `NAP_MOCK_MODE=true`, Redis falls back to in-memory.

### Testing caveats

- `npm run test:unit` and `npm run test:integration` (Vitest) pass, except `tests/tax/vat-calculator.test.ts`, which fails at import because it transitively pulls in a `server-only` module that Vitest does not stub. This is a pre-existing repo issue, not an environment problem.
- `npm run test:e2e` (Playwright) needs a real Clerk instance plus `E2E_CLERK_USER_EMAIL`; it auto-starts `npm run dev` as its web server. `npm run test:e2e:install` installs the Chromium browser.
- `npm run lint` passes (2 `no-img-element` warnings only); `npm run typecheck` passes.
