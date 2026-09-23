// DB Role Separation v1 — production-like E2E.
// Connects as LOGIN roles (not SET ROLE from a superuser). session_user must
// equal current_user. Isolation is proven with SET LOCAL inside a real
// transaction. NOBYPASSRLS alone is not sufficient.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import postgres from 'postgres';

const APP_ROLE = 'officia_sep_app';
const APP_PW = 'officia_sep_app';
const MIGRATE_ROLE = 'officia_sep_migrate';
const MIGRATE_PW = 'officia_sep_migrate';
const CONN = { connect_timeout: 5, onnotice: () => {}, max: 1 };

function envKey(key) {
  if (process.env[key]) return stripEnvValue(process.env[key]);
  try {
    const txt = fs.readFileSync(path.resolve('.env.local'), 'utf8');
    const m = txt.match(new RegExp(`^(?:export\\s+)?${key}=(.*)$`, 'm'));
    return m ? stripEnvValue(m[1]) : undefined;
  } catch {
    return undefined;
  }
}

function stripEnvValue(value) {
  let s = String(value || '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  return s.trim() || undefined;
}

function errText(err) {
  return [err?.message, err?.code, err?.cause?.message, err?.cause?.code]
    .filter(Boolean)
    .join(' | ') || String(err);
}

const baseUrl = process.env.RLS_TEST_DATABASE_URL || envKey('DATABASE_URL');
const ADMIN_URL = process.env.RLS_TEST_ADMIN_URL || baseUrl;
const swapDb = (url, db) => {
  const u = new URL(url);
  u.pathname = '/' + db;
  return u.toString();
};
const withUser = (url, user, password) => {
  const u = new URL(url);
  u.username = user;
  u.password = password;
  return u.toString();
};

let testDbUrl = null;
let appUrl = null;
let migrateUrl = null;
let admin = null;
let testDbName = null;
let provisionErr = null;
let A = null, B = null, DRAFT = null, INV_A = null, INV_B = null;
let USER_A_OWNER = null, USER_A_MEMBER = null, USER_B_OWNER = null, USER_INACTIVE = null;

const orgAOwner = () => ({
  tenantId: A, userId: USER_A_OWNER, clerkId: 'clerk-a-owner', role: 'owner',
});
const orgAMember = () => ({
  tenantId: A, userId: USER_A_MEMBER, clerkId: 'clerk-a-member', role: 'accountant',
});
const orgBOwner = () => ({
  tenantId: B, userId: USER_B_OWNER, clerkId: 'clerk-b-owner', role: 'owner',
});

async function connect(url) {
  const c = postgres(url, CONN);
  await c`SELECT 1`;
  return c;
}

async function provision() {
  const base = await connect(ADMIN_URL);
  testDbName = 'officia_sep_test_' + Date.now().toString(36);
  await base.unsafe(`CREATE DATABASE "${testDbName}"`);
  await base.end({ timeout: 1 }).catch(() => {});

  testDbUrl = swapDb(ADMIN_URL, testDbName);
  appUrl = withUser(testDbUrl, APP_ROLE, APP_PW);
  migrateUrl = withUser(testDbUrl, MIGRATE_ROLE, MIGRATE_PW);
  admin = await connect(testDbUrl);

  await admin.unsafe(`DROP ROLE IF EXISTS ${APP_ROLE}`);
  await admin.unsafe(`DROP ROLE IF EXISTS ${MIGRATE_ROLE}`);
  await admin.unsafe(`CREATE ROLE ${MIGRATE_ROLE} LOGIN PASSWORD '${MIGRATE_PW}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
  await admin.unsafe(`CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PW}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
  await admin.unsafe(`GRANT CONNECT ON DATABASE "${testDbName}" TO ${MIGRATE_ROLE}`);
  await admin.unsafe(`GRANT CONNECT ON DATABASE "${testDbName}" TO ${APP_ROLE}`);
  await admin.unsafe(`GRANT USAGE, CREATE ON SCHEMA public TO ${MIGRATE_ROLE}`);
  await admin.unsafe(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`);
  await admin.unsafe(`REVOKE CREATE ON SCHEMA public FROM ${APP_ROLE}`);

  const stmts = [];
  stmts.push(`CREATE TABLE tenants (id uuid PRIMARY KEY, name text NOT NULL, bulstat text, vat_number text, address text)`);
  stmts.push(`CREATE TABLE users (id uuid PRIMARY KEY, tenant_id uuid REFERENCES tenants(id), clerk_id text NOT NULL UNIQUE, email text, is_active boolean DEFAULT true)`);
  stmts.push(`CREATE TABLE roles (id uuid PRIMARY KEY, tenant_id uuid)`);
  stmts.push(`CREATE TABLE journal_headers (id uuid PRIMARY KEY, tenant_id uuid NOT NULL, journal_number text UNIQUE, status text NOT NULL DEFAULT 'draft', posted_by uuid)`);
  stmts.push(`CREATE TABLE invoices (id serial PRIMARY KEY, tenant_id uuid, amount text)`);
  stmts.push(`CREATE TABLE invoice_lines (id serial PRIMARY KEY, invoice_id integer REFERENCES invoices(id), description text)`);
  stmts.push(`CREATE TABLE employees (id uuid PRIMARY KEY, tenant_id uuid)`);
  stmts.push(`CREATE TABLE purchase_invoices (id uuid PRIMARY KEY, tenant_id uuid)`);
  stmts.push(`CREATE TABLE purchase_invoice_lines (id uuid PRIMARY KEY, invoice_id uuid REFERENCES purchase_invoices(id))`);
  stmts.push(`CREATE TABLE tax_declarations (id text PRIMARY KEY, tenant_id text)`);
  stmts.push(`CREATE TABLE financial_reports (id text PRIMARY KEY, tenant_id text)`);
  stmts.push(`CREATE TABLE nap_integrations (id uuid PRIMARY KEY, organization_id uuid)`);
  stmts.push(`CREATE TABLE nap_access_log (id uuid PRIMARY KEY, integration_id uuid)`);
  stmts.push(`CREATE TABLE bank_accounts (id uuid PRIMARY KEY, tenant_id uuid)`);
  stmts.push(`CREATE TABLE bank_transactions (id uuid PRIMARY KEY, account_id uuid REFERENCES bank_accounts(id))`);

  const uuidTenant = [
    'account_plan', 'accounting_rules', 'activity_logs', 'ai_inbox', 'approvals',
    'audit_log', 'budgets', 'company_divisions', 'contracts', 'contract_versions',
    'contract_parties', 'counterparties', 'depreciation_runs', 'documents',
    'expenses', 'fiscal_years', 'fixed_assets', 'inventory_items',
    'inventory_movements', 'leave_requests', 'payroll_runs', 'projects',
    'tasks', 'time_entries', 'vat_journals', 'webhooks', 'work_schedules',
  ];
  for (const t of uuidTenant) stmts.push(`CREATE TABLE ${t} (id uuid PRIMARY KEY, tenant_id uuid)`);

  const children = {
    journal_lines: 'journal_id', payroll_slip_items: 'run_id',
    depreciation_logs: 'run_id', accounting_periods: 'fiscal_year_id',
  };
  for (const [t, fk] of Object.entries(children)) stmts.push(`CREATE TABLE ${t} (id uuid PRIMARY KEY, ${fk} uuid)`);

  for (const s of stmts) await admin.unsafe(s);

  const owned = await admin`
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  `;
  for (const row of owned) {
    await admin.unsafe(`ALTER TABLE ${row.relname} OWNER TO ${MIGRATE_ROLE}`);
  }

  await admin.unsafe(fs.readFileSync(path.resolve('src/lib/db/rls.sql'), 'utf8'));

  await admin.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`);
  await admin.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE}`);
  await admin.unsafe(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${APP_ROLE}`);
  await admin.unsafe(`GRANT ALL ON ALL TABLES IN SCHEMA public TO ${MIGRATE_ROLE}`);
  await admin.unsafe(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${MIGRATE_ROLE}`);
}

async function seed() {
  A = crypto.randomUUID();
  B = crypto.randomUUID();
  USER_A_OWNER = crypto.randomUUID();
  USER_A_MEMBER = crypto.randomUUID();
  USER_B_OWNER = crypto.randomUUID();
  USER_INACTIVE = crypto.randomUUID();
  await admin.unsafe(`INSERT INTO tenants (id, name) VALUES ('${A}','Org A'), ('${B}','Org B')`);
  await admin.unsafe(`INSERT INTO users (id, tenant_id, clerk_id, email, is_active) VALUES
      ('${USER_A_OWNER}','${A}','clerk-a-owner','a-owner@example.com', true),
      ('${USER_A_MEMBER}','${A}','clerk-a-member','a-member@example.com', true),
      ('${USER_B_OWNER}','${B}','clerk-b-owner','b-owner@example.com', true),
      ('${USER_INACTIVE}','${A}','clerk-off','off@example.com', false)`);
  const journals = await admin.unsafe(`INSERT INTO journal_headers (id, tenant_id, status) VALUES
      ('${crypto.randomUUID()}','${A}','draft'),
      ('${crypto.randomUUID()}','${A}','posted'),
      ('${crypto.randomUUID()}','${B}','posted') RETURNING id, status, tenant_id`);
  DRAFT = journals.find(r => r.status === 'draft').id;
  const invoices = await admin.unsafe(
    `INSERT INTO invoices (tenant_id, amount) VALUES ('${A}','100'), ('${B}','200') RETURNING id, tenant_id`,
  );
  INV_A = invoices.find(r => r.tenant_id === A).id;
  INV_B = invoices.find(r => r.tenant_id === B).id;
}

async function applyLocal(tx, ctx) {
  if (ctx.clerkId) await tx.unsafe(`SET LOCAL app.current_clerk_id = '${ctx.clerkId}'`);
  if (ctx.tenantId) await tx.unsafe(`SET LOCAL app.current_tenant_id = '${ctx.tenantId}'`);
  if (ctx.userId) await tx.unsafe(`SET LOCAL app.current_user_id = '${ctx.userId}'`);
  if (ctx.role) await tx.unsafe(`SET LOCAL app.current_user_role = '${ctx.role}'`);
}

async function asAppTx(ctx, fn) {
  const c = await connect(appUrl);
  try {
    return await c.begin(async (tx) => {
      await applyLocal(tx, ctx);
      return fn(tx);
    });
  } finally {
    await c.end({ timeout: 1 }).catch(() => {});
  }
}

before(async () => {
  try {
    if (!baseUrl) throw new Error('DATABASE_URL липсва (.env.local)');
    await provision();
    await seed();
  } catch (err) {
    console.error('[rls-role-separation] setup failed:', errText(err));
    if (process.env.CI) throw err;
    provisionErr = err;
    if (admin) await admin.end({ timeout: 1 }).catch(() => {});
    admin = null;
  }
});

after(async () => {
  if (admin) await admin.end({ timeout: 1 }).catch(() => {});
  if (testDbName && baseUrl) {
    try {
      const c = await connect(ADMIN_URL);
      await c.unsafe(`DROP DATABASE IF EXISTS ${testDbName} WITH (FORCE)`);
      await c.unsafe(`DROP ROLE IF EXISTS ${APP_ROLE}`);
      await c.unsafe(`DROP ROLE IF EXISTS ${MIGRATE_ROLE}`);
      await c.end({ timeout: 1 }).catch(() => {});
    } catch { /* best effort */ }
  }
});

function ok(t) {
  if (provisionErr) {
    t.skip('PostgreSQL недостижим: ' + errText(provisionErr));
    return false;
  }
  return true;
}

test('drizzle migrate uses DATABASE_MIGRATE_URL, not the application URL', () => {
  const src = fs.readFileSync(path.resolve('drizzle.config.ts'), 'utf8');
  assert.match(src, /DATABASE_MIGRATE_URL/);
  const urls = fs.readFileSync(path.resolve('src/lib/db/connection-urls.ts'), 'utf8');
  assert.match(urls, /DATABASE_MIGRATE_URL/);
  assert.match(urls, /DATABASE_MIGRATE_URL must differ from DATABASE_URL/);
});

test('application LOGIN identity: current_user = session_user = app role', async (t) => {
  if (!ok(t)) return;
  const c = await connect(appUrl);
  try {
    const [id] = await c`SELECT current_user, session_user`;
    assert.equal(id.current_user, APP_ROLE);
    assert.equal(id.session_user, APP_ROLE);
    const [role] = await c`
      SELECT rolname, rolsuper, rolbypassrls
      FROM pg_roles
      WHERE rolname = current_user
    `;
    assert.equal(role.rolname, APP_ROLE);
    assert.equal(role.rolsuper, false);
    assert.equal(role.rolbypassrls, false);
  } finally {
    await c.end({ timeout: 1 }).catch(() => {});
  }
});

test('pg_tables: table owner ≠ application role; owner is migration role', async (t) => {
  if (!ok(t)) return;
  const c = await connect(appUrl);
  try {
    const tables = await c`
      SELECT schemaname, tablename, tableowner
      FROM pg_tables
      WHERE schemaname = 'public'
    `;
    assert.ok(tables.length > 0);
    const appOwned = tables.filter(r => r.tableowner === APP_ROLE);
    assert.deepEqual(appOwned, [], 'application role must not own public tables');
    const invoices = tables.find(r => r.tablename === 'invoices');
    assert.equal(invoices.tableowner, MIGRATE_ROLE);
    const users = tables.find(r => r.tablename === 'users');
    assert.equal(users.tableowner, MIGRATE_ROLE);
  } finally {
    await c.end({ timeout: 1 }).catch(() => {});
  }
});

test('RLS is enabled; FORCE RLS stays off', async (t) => {
  if (!ok(t)) return;
  const c = await connect(appUrl);
  try {
    const [row] = await c`
      SELECT c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'invoices'
    `;
    assert.equal(row.relrowsecurity, true);
    assert.equal(row.relforcerowsecurity, false);
  } finally {
    await c.end({ timeout: 1 }).catch(() => {});
  }
});

test('migration LOGIN identity can ALTER TABLE; app LOGIN cannot', async (t) => {
  if (!ok(t)) return;
  const migrate = await connect(migrateUrl);
  try {
    const [id] = await migrate`SELECT current_user, session_user`;
    assert.equal(id.current_user, MIGRATE_ROLE);
    assert.equal(id.session_user, MIGRATE_ROLE);
    await migrate.unsafe('ALTER TABLE invoices ADD COLUMN sep_probe text');
    await migrate.unsafe('ALTER TABLE invoices DROP COLUMN sep_probe');
  } finally {
    await migrate.end({ timeout: 1 }).catch(() => {});
  }

  const app = await connect(appUrl);
  try {
    await assert.rejects(
      app.unsafe('ALTER TABLE invoices ADD COLUMN sep_probe text'),
      /permission denied|must be owner/i,
    );
  } finally {
    await app.end({ timeout: 1 }).catch(() => {});
  }
});

test('E2E Org A owner → Org A ALLOW', async (t) => {
  if (!ok(t)) return;
  await asAppTx(orgAOwner(), async (tx) => {
    const rows = await tx`SELECT id, tenant_id FROM invoices WHERE id = ${INV_A}`;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].tenant_id, A);
  });
});

test('E2E Org A owner → Org B DENY', async (t) => {
  if (!ok(t)) return;
  await asAppTx(orgAOwner(), async (tx) => {
    const read = await tx`SELECT id FROM invoices WHERE id = ${INV_B}`;
    assert.equal(read.length, 0);
    const written = await tx`UPDATE invoices SET amount = 'hack' WHERE id = ${INV_B} RETURNING id`;
    assert.equal(written.length, 0);
  });
});

test('E2E Org B owner → Org A DENY', async (t) => {
  if (!ok(t)) return;
  await asAppTx(orgBOwner(), async (tx) => {
    const read = await tx`SELECT id FROM invoices WHERE id = ${INV_A}`;
    assert.equal(read.length, 0);
    const deleted = await tx`DELETE FROM journal_headers WHERE id = ${DRAFT} RETURNING id`;
    assert.equal(deleted.length, 0);
  });
});

test('E2E Org B owner → Org B ALLOW', async (t) => {
  if (!ok(t)) return;
  await asAppTx(orgBOwner(), async (tx) => {
    const rows = await tx`SELECT id, tenant_id FROM invoices WHERE id = ${INV_B}`;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].tenant_id, B);
  });
});

test('E2E no tenant context DENY', async (t) => {
  if (!ok(t)) return;
  await asAppTx({ userId: USER_A_OWNER, clerkId: 'clerk-a-owner', role: 'owner' }, async (tx) => {
    const rows = await tx`SELECT id FROM invoices`;
    assert.equal(rows.length, 0);
  });
});

test('E2E inactive membership DENY', async (t) => {
  if (!ok(t)) return;
  await asAppTx({
    tenantId: A, userId: USER_INACTIVE, clerkId: 'clerk-off', role: 'owner',
  }, async (tx) => {
    const rows = await tx`SELECT id FROM invoices`;
    assert.equal(rows.length, 0);
  });
});

test('E2E Org A member → owner journal operation DENY', async (t) => {
  if (!ok(t)) return;
  await asAppTx(orgAMember(), async (tx) => {
    const own = await tx`SELECT id FROM invoices WHERE id = ${INV_A}`;
    assert.equal(own.length, 1);
    const deleted = await tx`DELETE FROM journal_headers WHERE id = ${DRAFT} RETURNING id`;
    assert.equal(deleted.length, 0);
    const updated = await tx`UPDATE journal_headers SET status = 'canceled' WHERE id = ${DRAFT} RETURNING id`;
    assert.equal(updated.length, 0);
  });
});

test('E2E Org A owner → permitted journal operation ALLOW', async (t) => {
  if (!ok(t)) return;
  await asAppTx(orgAOwner(), async (tx) => {
    const rows = await tx`UPDATE journal_headers SET status = 'canceled' WHERE id = ${DRAFT} RETURNING id`;
    assert.equal(rows.length, 1);
  });
  await admin.unsafe(`UPDATE journal_headers SET status = 'draft' WHERE id = '${DRAFT}'`);
});
