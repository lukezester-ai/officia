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

Frozen technical gate after Baseline v1 (`e82fa63`). **MERGED / VERIFIED** at `79a814d`.

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

Status: **MERGED / VERIFIED** at `79a814d` (PR #6). Do not reopen this baseline for Redis work.

FORCE RLS stays off. Proof remains `tests/integration/rls-role-separation.test.mjs`.

Still later (do not start yet): immutable audit → `user_tenants`.

## Redis distributed rate limiting v1

Frozen next gate after DB Role Separation (`79a814d`). Own commit/PR. Do not mix immutable audit or `user_tenants`.

In-memory `Map` buckets are single-instance and IP keys couple tenants behind NAT. This gate replaces them with a tenant-scoped Redis counter shared by every application process.

```
requireTenant()
  → officia:rl:v1:{tenantId}:{route}
  → Redis INCR + EXPIRE (atomic Lua)
  → allow or 429
```

1. `REDIS_URL` required in production (`src/instrumentation.ts`)
2. Key is tenant + route — never IP as the tenant identity
3. Two application instances share one counter
4. Tenant A hitting the limit does not block tenant B
5. Missing tenant → deny (403)
6. Redis down → fail closed (503), no in-memory fallback
7. AI chat: 20 / 60s; other wrapped APIs: 60 / 60s

**Definition of Done:** Rate limits are tenant-aware and enforced in Redis with an atomic increment visible to every application instance.

Proof: `tests/rate-limit.contract.test.ts` + `tests/integration/redis-rate-limit.test.mjs` (must **fail** in CI if Redis is down).

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

Chat is authenticated and tenant-scoped. Request size, message count, and message length are capped. Clients receive generic errors plus a `requestId`; details stay in server logs. Rate limits are tenant-scoped Redis counters (`officia:rl:v1:{tenantId}:{route}`), not per-process Maps.

## Secrets

Never commit `.env.local`. Production needs at least:

- `DATABASE_URL` (application role)
- `DATABASE_MIGRATE_URL` (migration role)
- `NEXT_PUBLIC_APP_URL` (https origin)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY` and `STRIPE_PRICE_*`
- `REDIS_URL` (required in production for distributed rate limits)
