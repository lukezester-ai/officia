# Officia

Officia is an AI-first SaaS concept for accountants and modern office teams.

## Brand

- **Name:** Officia
- **Tagline:** Your office. Smarter.
- **Positioning:** European, professional, AI-native office operating system
- **Colors:** Deep navy `#0F1F3D`, electric indigo `#4F46E5`, white, light slate

## MVP v1

- Landing page
- Waitlist form UI
- Product module presentation
- 2026 SaaS stack positioning

## Planned stack

- Next.js 15 App Router
- Supabase database/storage/realtime
- Drizzle ORM
- Claude API for AI assistant
- shadcn/ui + Tailwind
- Clerk auth
- Stripe subscriptions
- Resend emails
- Vercel hosting

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Waitlist backend

1. Create a Supabase project.
2. Run `supabase-waitlist.sql` in Supabase SQL Editor.
3. Add these values to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_your_resend_key
OFFICIA_EMAIL_FROM=Officia <hello@officia.bg>
OFFICIA_LEAD_NOTIFY_TO=founder@officia.bg
```

The landing form posts to `/api/waitlist`, stores unique emails in `public.waitlist`, sends a confirmation email to the subscriber and optionally sends an internal lead notification to `OFFICIA_LEAD_NOTIFY_TO`.

## Auth

Clerk is configured for:

- `/sign-in`
- `/sign-up`
- protected `/dashboard`

Add these values to `.env.local` from your Clerk dashboard:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

## Billing

Stripe billing placeholders are configured for:

- `/pricing`
- `/api/billing/checkout`
- dashboard billing preview card

Add these values to `.env.local` when you create Stripe products/prices:

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_PRICE_STARTER=price_starter
STRIPE_PRICE_PRO=price_pro
STRIPE_PRICE_FIRM=price_firm
```

The current checkout route is intentionally a placeholder. It validates the selected plan and redirects back to `/pricing` until the live Stripe SDK checkout session is wired.

## App database

Drizzle is configured for the Supabase Postgres app schema:

- `workspaces`
- `workspace_members`
- `invoices`
- `documents`
- `employees`
- `subscriptions`

Files:

- `lib/db/schema.ts`
- `lib/db/index.ts`
- `drizzle.config.ts`
- `supabase-app-schema.sql`

Add a Supabase pooled connection string to `.env.local`:

```bash
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

Useful commands:

```bash
npm run db:generate
npm run db:push
```

For manual setup, run `supabase-app-schema.sql` in Supabase SQL Editor.

## Workspace bootstrap

When an authenticated user opens `/dashboard`, Officia attempts to create the first workspace automatically:

- `workspaces` owner record
- `workspace_members` owner membership
- `subscriptions` starter trial

If `DATABASE_URL` is missing or the schema has not been applied, the dashboard stays available in preview mode and shows a setup status message.

## Invoice MVP

The first CRUD screen is available at `/dashboard/invoices`.

It supports:

- listing workspace invoices
- preview invoices when the database is not ready
- creating draft invoices with a server action
- status badges and empty state

Invoice creation requires:

- Clerk authenticated user
- successful workspace bootstrap
- `DATABASE_URL`
- `supabase-app-schema.sql` applied


## Time Tracking MVP

The time workspace is available at `/dashboard/time`.

It supports:

- creating employee HR records
- recording check-in, check-out, break start and break end entries
- assigning weekly work schedules
- preview data when the database is not ready

Time tracking requires:

- Clerk authenticated user
- successful workspace bootstrap
- `DATABASE_URL`
- updated `supabase-app-schema.sql` applied
## Document MVP

The document workspace is available at `/dashboard/documents`.

It supports:

- listing workspace documents
- preview documents when the database is not ready
- creating document metadata records with a server action
- AI summary placeholder
- status badges for upload/extraction flow

Real file upload is the next layer and will use Supabase Storage buckets plus signed upload URLs.

## Supabase Storage uploads

Document uploads use a private Supabase Storage bucket and a signed upload URL API.

Setup:

1. Run `supabase-storage.sql` in the Supabase SQL Editor.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Set `SUPABASE_DOCUMENTS_BUCKET=officia-documents`.

Upload flow:

- `/api/documents/signed-upload` creates a signed upload URL for the authenticated workspace.
- `/dashboard/documents` uploads the selected file directly to Supabase Storage.
- the document metadata is saved in the `documents` table with `storagePath`.

## Next implementation steps

1. Add Claude assistant prototype for document summaries.
2. Wire live Stripe checkout sessions.
3. Add invoice email sending and status workflow.
4. Add employee self-service, approvals and monthly timesheet export.
5. Add workspace settings and members UI.
6. Add document download/view signed URLs.



