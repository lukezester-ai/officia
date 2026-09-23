# Security policy

Report vulnerabilities privately to `info@agrinexus.eu`. Do not open public GitHub issues for secrets, auth bypasses, or tenant isolation failures.

## Runtime trust boundary

Officia is a multi-tenant ERP. Every privileged request must follow:

```
Clerk session → requireTenant() → PostgreSQL RLS GUCs → query → audit
```

- **Auth:** Clerk. Dashboard and private `/api/*` routes require a signed-in user.
- **Tenant:** `src/lib/auth/get-tenant.ts` resolves `users.tenant_id` from `clerk_id`.
- **RLS:** `requireTenant()` binds `app.current_tenant_id`, `app.current_user_id`, and `app.current_user_role` on a reserved connection for the rest of the request (`src/lib/db/rls-session.ts`). Policies live in `src/lib/db/rls.sql`.
- **Public APIs only:** `/api/webhooks/*`, `/api/health`, `/api/cron/*` (Bearer `CRON_SECRET`), `/api/ai/webhook` (Bearer `AI_WEBHOOK_SECRET`).

## Production database roles

The `DATABASE_URL` user used by the app must **not** be the table owner, **or** `FORCE ROW LEVEL SECURITY` must be enabled after RLS session binding is verified.

Required:

- Application role: `NOSUPERUSER` + `NOBYPASSRLS`
- Separate owner/migration role for `drizzle-kit migrate`
- RLS contract tests: `npm run test:rls` (runs in CI)

Do not enable FORCE RLS until application traffic sets GUCs on every tenant query. Owner connections still bypass RLS; that is why the app role must differ from the owner.

## Billing

`POST /api/stripe/checkout` requires an authenticated tenant, an allow-listed plan, a server-side Stripe Price ID, and `NEXT_PUBLIC_APP_URL` for success/cancel URLs. GET is rejected. Client-supplied Origin and dynamic ad-hoc prices are not used.

## AI

Chat is authenticated and tenant-scoped. Request size, message count, and message length are capped. Clients receive generic errors plus a `requestId`; details stay in server logs. In-memory rate limits are a single-instance control and must move to Redis before horizontal scale-out.

## Secrets

Never commit `.env.local`. Production needs at least:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL` (https origin)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY` and `STRIPE_PRICE_*`
- `CRON_SECRET` / webhook secrets when those endpoints are enabled
