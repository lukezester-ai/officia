create extension if not exists pgcrypto;

create type workspace_role as enum ('owner', 'admin', 'member');
create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');
create type document_status as enum ('uploaded', 'processing', 'ready', 'failed');
create type employee_status as enum ('active', 'on_leave', 'inactive');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_clerk_user_id text not null,
  country text not null default 'BG',
  currency text not null default 'EUR',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  clerk_user_id text not null,
  email text not null,
  role workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, clerk_user_id)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_number text not null,
  client_name text not null,
  client_email text,
  status invoice_status not null default 'draft',
  currency text not null default 'EUR',
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  due_date timestamptz,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, invoice_number)
);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 20,
  line_total numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  file_name text not null,
  file_type text,
  storage_path text,
  status document_status not null default 'uploaded',
  ai_summary text,
  extracted_text_preview text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  full_name text not null,
  email text,
  role_title text,
  status employee_status not null default 'active',
  starts_at timestamptz,
  ends_at timestamptz,
  vacation_days_total integer not null default 20,
  vacation_days_used integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  type entry_type not null,
  recorded_at timestamptz not null default now(),
  note text,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  day_of_week day_of_week not null,
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text not null default 'starter',
  status subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_owner_clerk_user_id_idx on public.workspaces(owner_clerk_user_id);
create index if not exists workspace_members_email_idx on public.workspace_members(email);
create index if not exists invoices_workspace_id_idx on public.invoices(workspace_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoice_line_items_invoice_id_idx on public.invoice_line_items(invoice_id);
create index if not exists documents_workspace_id_idx on public.documents(workspace_id);
create index if not exists documents_status_idx on public.documents(status);
create index if not exists documents_created_at_idx on public.documents(created_at);
create index if not exists employees_workspace_id_idx on public.employees(workspace_id);
create index if not exists employees_status_idx on public.employees(status);
create index if not exists time_entries_employee_id_idx on public.time_entries(employee_id);
create index if not exists time_entries_recorded_at_idx on public.time_entries(recorded_at);
create index if not exists work_schedules_employee_id_idx on public.work_schedules(employee_id);
create index if not exists work_schedules_employee_active_idx on public.work_schedules(employee_id, is_active);
create index if not exists subscriptions_stripe_customer_id_idx on public.subscriptions(stripe_customer_id);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.documents enable row level security;
alter table public.employees enable row level security;
alter table public.time_entries enable row level security;
alter table public.work_schedules enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Service role can manage workspaces" on public.workspaces;
create policy "Service role can manage workspaces" on public.workspaces for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage workspace members" on public.workspace_members;
create policy "Service role can manage workspace members" on public.workspace_members for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage invoices" on public.invoices;
create policy "Service role can manage invoices" on public.invoices for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage invoice line items" on public.invoice_line_items;
create policy "Service role can manage invoice line items" on public.invoice_line_items for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage documents" on public.documents;
create policy "Service role can manage documents" on public.documents for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage employees" on public.employees;
create policy "Service role can manage employees" on public.employees for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage time entries" on public.time_entries;
create policy "Service role can manage time entries" on public.time_entries for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage work schedules" on public.work_schedules;
create policy "Service role can manage work schedules" on public.work_schedules for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage subscriptions" on public.subscriptions;
create policy "Service role can manage subscriptions" on public.subscriptions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');


