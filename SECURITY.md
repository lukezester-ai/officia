# Security policy

Report vulnerabilities privately to `info@agrinexus.eu`. Do not open public GitHub issues for secrets, auth bypasses, or tenant isolation failures.

## Officia Security Baseline v1

Locked at `e82fa63` on `main`. Do not mix later gates into that commit.

- Stripe fail-closed (`POST` only, authenticated tenant, server-side Price IDs, allow-listed `NEXT_PUBLIC_APP_URL`)
- Clerk authentication on dashboard and private APIs
- Tenant authorization via `requireTenant()`
- API boundary with an explicit public allow-list
- RLS session context per request
- RLS integration tests in `npm run ci` / GitHub Actions
- AI request limits, generic client errors, and `requestId`
- `SECURITY.md`
- Migration on deploy (`render.yaml` start command)

## Production DB Role Separation v1

Frozen technical gate after Baseline v1 (`e82fa63`). Own commit/PR. Not verified until CI Postgres E2E is green. Redis starts only after this gate is **MERGED / VERIFIED**.

```
Clerk
  → requireTenant()
  → application LOGIN role (NOBYPASSRLS, not table owner)
  → SET LOCAL app.current_tenant_id (real transaction)
  → RLS policy
  → query
```

```
migration role  ≠  database owner  ≠  application role
```

NOBYPASSRLS is necessary, not sufficient. Isolation is proven with two organizations and production-like LOGIN roles (`current_user` = `session_user` = application role), not `SET ROLE` from a superuser.

1. Create/identify migration/admin role and application role
2. Prove application role ≠ table owner, NOBYPASSRLS, RLS enabled, migrations not as application role
3. E2E: Org A / owner, Org A / member, Org B / owner
4. Verify: A→A ALLOW, A→B DENY, B→A DENY, no tenant DENY, inactive DENY, member→owner op DENY, owner→permitted op ALLOW

PostgreSQL identity (from the application connection):

```sql
SELECT current_user;
SELECT session_user;
SELECT rolname, rolsuper, rolbypassrls
FROM pg_roles
WHERE rolname = current_user;

SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public';
```

**Definition of Done:** Application database access is performed by a non-owner, non-bypass role, and cross-tenant access has been verified against PostgreSQL RLS using real transactions.

FORCE RLS stays off. `user_tenants` does not start before this gate is closed.

Proof: `tests/integration/rls-role-separation.test.mjs` (must **fail** in CI if Postgres is down; local skip only). Boot assert: `src/instrumentation.ts`. Production migrate: `DATABASE_MIGRATE_URL` must differ from `DATABASE_URL`.

Still later (do not start yet): Redis rate limiting → immutable audit → `user_tenants`.

## Runtime trust boundary

Officia is a multi-tenant ERP. Every privileged request must follow:

```
Clerk session → requireTenant() → PostgreSQL RLS GUCs → query
```

- **Auth:** Clerk. Dashboard and private `/api/*` routes require a signed-in user.
- **Tenant:** `src/lib/auth/get-tenant.ts` binds `app.current_clerk_id`, loads `users`, rejects inactive membership, then binds tenant/user/role GUCs.
- **RLS:** Reserved connection in `src/lib/db/rls-session.ts`. Policies in `src/lib/db/rls.sql`. Role bootstrap in `src/lib/db/roles.sql`.
- **Public APIs only:** `/api/webhooks/*`, `/api/health`, `/api/cron/*` (Bearer `CRON_SECRET`), `/api/ai/webhook` (Bearer `AI_WEBHOOK_SECRET`).

## Billing

`POST /api/stripe/checkout` requires an authenticated tenant, an allow-listed plan, a server-side Stripe Price ID, and `NEXT_PUBLIC_APP_URL` for success/cancel URLs. GET is rejected. Client-supplied Origin and dynamic ad-hoc prices are not used.

## AI

Chat is authenticated and tenant-scoped. Request size, message count, and message length are capped. Clients receive generic errors plus a `requestId`; details stay in server logs. In-memory rate limits are a single-instance control and must move to Redis before horizontal scale-out.

## Secrets

Never commit `.env.local`. Production needs at least:

- `DATABASE_URL` (application role)
- `DATABASE_MIGRATE_URL` (migration role)
- `NEXT_PUBLIC_APP_URL` (https origin)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY` and `STRIPE_PRICE_*`
- `CRON_SECRET` / webhook secrets when those endpoints are enabled
