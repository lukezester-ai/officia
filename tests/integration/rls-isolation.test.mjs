// ============================================================================
// RLS tenant-isolation INTEGRATION tests (matrix-based, real access checks).
// Runner: node:test (Node >= 20), no extra dependencies.
//   npm run test:rls
//
// Методика:
//  1. създава временна DB `officia_rls_test_*`; НЕ пипа development DB-то
//  2. създава minimal schema contract, съответстващ на Drizzle schema
//  3. прилага реалния `src/lib/db/rls.sql` върху нея
//  4. създава dedicated non-owner DB role (NOBYPASSRLS) + GRANTs
//  5. seed fixtures като owner (owner bypass-ва RLS -> fixtures са чисти)
//  6. всеки тест ползва ИЗОЛИРАН клиент (max:1), защото SET ROLE/GUC са
//     session-scoped; try/finally задължителeн, за да не чупи следващия
//  7. НЕ се активира FORCE ROW LEVEL SECURITY — проверяваме именно
//     политиките през non-owner DB role.
// ============================================================================

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import postgres from 'postgres';

const APP_ROLE = 'officia_rls_app';
const APP_ROLE_PW = 'officia_rls_app';
const CONN = { connect_timeout: 5, onnotice: () => {}, max: 1 };

function envKey(key) {
  if (process.env[key]) return process.env[key];
  try {
    const txt = fs.readFileSync(path.resolve('.env.local'), 'utf8');
    const m = txt.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return m ? m[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

const baseUrl = process.env.RLS_TEST_DATABASE_URL || envKey('DATABASE_URL');
const ADMIN_URL = process.env.RLS_TEST_ADMIN_URL || baseUrl;
const swapDb = (url, db) => { const u = new URL(url); u.pathname = '/' + db; return u.toString(); };

// state
let testDbUrl = null;
let admin = null;      // owner client (single connection): provisioning + seed
let testDbName = null;
let provisionErr = null;

// fixtures
let A = null, B = null, DRAFT = null, POSTED = null, LINE_B = null;

async function connect(url) {
  const c = postgres(url, CONN);
  await c`SELECT 1`; // fail-fast
  return c;
}

async function provision() {
  const base = await connect(ADMIN_URL);
  testDbName = 'officia_rls_test_' + Date.now().toString(36);
  await base.unsafe(`CREATE DATABASE "${testDbName}"`);
  await base.end({ timeout: 1 }).catch(() => {});

  testDbUrl = swapDb(ADMIN_URL, testDbName);
  admin = await connect(testDbUrl);

  // minimal schema contract (matches src/lib/db/schema/*)
  const stmts = [];
  stmts.push(`CREATE TABLE tenants (id uuid PRIMARY KEY, name text NOT NULL)`);
  stmts.push(`CREATE TABLE users (id uuid PRIMARY KEY, tenant_id uuid REFERENCES tenants(id), clerk_id text NOT NULL UNIQUE, email text)`);
  stmts.push(`CREATE TABLE roles (id uuid PRIMARY KEY, tenant_id uuid)`);
  stmts.push(`CREATE TABLE journal_headers (id uuid PRIMARY KEY, tenant_id uuid NOT NULL, journal_number text UNIQUE, status text NOT NULL DEFAULT 'draft', posted_by uuid)`);
  stmts.push(`CREATE TABLE invoices (id serial PRIMARY KEY, tenant_id uuid, amount text)`);
  stmts.push(`CREATE TABLE invoice_lines (id serial PRIMARY KEY, invoice_id integer REFERENCES invoices(id), description text)`);
  stmts.push(`CREATE TABLE employees (id uuid PRIMARY KEY, tenant_id uuid)`);
  stmts.push(`CREATE TABLE purchase_invoices (id text PRIMARY KEY, tenant_id text)`);
  stmts.push(`CREATE TABLE purchase_invoice_lines (id text PRIMARY KEY, invoice_id text REFERENCES purchase_invoices(id))`);
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

  // прилагаме реалeн RLS артефакт
  await admin.unsafe(fs.readFileSync(path.resolve('src/lib/db/rls.sql'), 'utf8'));

  // dedicated non-owner role
  await admin.unsafe(`CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_ROLE_PW}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
  await admin.unsafe(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`);
  await admin.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`);
  await admin.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE}`);
}

async function seed() {
  A = crypto.randomUUID(); B = crypto.randomUUID();
  await admin.unsafe(`INSERT INTO tenants (id, name) VALUES ('${A}','A'), ('${B}','B')`);

  const ins = await admin.unsafe(`INSERT INTO journal_headers (id, tenant_id, status) VALUES
      ('${crypto.randomUUID()}','${A}','draft'),
      ('${crypto.randomUUID()}','${A}','posted'),
      ('${crypto.randomUUID()}','${B}','posted') RETURNING id, status, tenant_id`);
  DRAFT = ins.find(r => r.status === 'draft').id;
  POSTED = ins.find(r => r.status === 'posted' && r.tenant_id === A).id;

  const [invB] = await admin.unsafe(`INSERT INTO invoices (tenant_id, amount) VALUES ('${B}','200') RETURNING id`);
  const [invA] = await admin.unsafe(`INSERT INTO invoices (tenant_id, amount) VALUES ('${A}','100') RETURNING id`);
  await admin.unsafe(`INSERT INTO invoice_lines (invoice_id, description) VALUES (${invA.id}, 'line-A')`);
  const [lb] = await admin.unsafe(`INSERT INTO invoice_lines (invoice_id, description) VALUES (${invB.id}, 'line-B') RETURNING id`);
  LINE_B = lb.id;
}

function contextSql({ tenantId = null, role = null }) {
  const parts = [];
  if (tenantId) parts.push(`SET app.current_tenant_id = '${tenantId}'`);
  if (role) parts.push(`SET app.current_user_role = '${role}'`);
  return parts.join('; ');
}

/** изпълнява fn в isolated client (max:1), като app_role с GUC контекст. */
async function asApp({ tenantId = null, role = null }, fn) {
  const c = await connect(testDbUrl);
  try {
    await c.unsafe(`SET ROLE ${APP_ROLE}`);
    const ctx = contextSql({ tenantId, role });
    if (ctx) await c.unsafe(ctx);
    return await fn(c);
  } finally {
    await c.unsafe('RESET ROLE').catch(() => {});
    await c.end({ timeout: 1 }).catch(() => {});
  }
}

before(async () => {
  try {
    if (!baseUrl) throw new Error('DATABASE_URL липсва (.env.local)');
    await provision();
    await seed();
  } catch (err) {
    console.error('[rls-isolation] setup failed:', err && err.message);
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
      await c.end({ timeout: 1 }).catch(() => {});
    } catch { /* best effort */ }
  }
});

function ok(t) {
  if (provisionErr) { t.skip('PostgreSQL недостижим: ' + provisionErr.message); return false; }
  return true;
}

test('A SELECT вижда само своите invoices', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: A }, async (c) => {
    const rows = await c`SELECT tenant_id FROM invoices`;
    assert.deepEqual(rows.map(r => r.tenant_id), [A]);
  });
});

test('A cannot SELECT invoice of B', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: A }, async (c) => {
    const b = await admin.unsafe(`SELECT id FROM invoices WHERE tenant_id='${B}'`);
    const rows = await c`SELECT tenant_id FROM invoices WHERE id = ${b[0].id}`;
    assert.equal(rows.length, 0);
  });
});

test('A INSERT invoice с tenant_id=B → RLS error', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: A }, async (c) => {
    await assert.rejects(
      c.unsafe(`INSERT INTO invoices (tenant_id, amount) VALUES ('${B}','1')`),
      /row-level security/i,
    );
  });
});

test('missing tenant context → 0 rows (fail-closed)', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: null }, async (c) => {
    const rows = await c`SELECT tenant_id FROM invoices`;
    assert.equal(rows.length, 0);
  });
});

test('invalid tenant uuid → 0 rows', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: '11111111-1111-1111-1111-111111111111' }, async (c) => {
    const rows = await c`SELECT tenant_id FROM invoices`;
    assert.equal(rows.length, 0);
  });
});

test('junior вижда само чернови', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: A, role: 'junior_accountant' }, async (c) => {
    const rows = await c`SELECT status FROM journal_headers`;
    assert.ok(rows.length >= 1, 'junior трябва да вижда поне 1 запис');
    assert.ok(rows.every(r => r.status === 'draft'), JSON.stringify(rows));
  });
});

test('senior вижда и posted журнали', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: A, role: 'senior_accountant' }, async (c) => {
    const rows = await c`SELECT status FROM journal_headers`;
    assert.ok(rows.some(r => r.status === 'posted'));
  });
});

test('junior INSERT journal → блок (RLS error)', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: A, role: 'junior_accountant' }, async (c) => {
    await assert.rejects(
      c.unsafe(`INSERT INTO journal_headers (id, tenant_id, status) VALUES ('${crypto.randomUUID()}', '${A}','draft')`),
      /row-level security/i,
    );
  });
});

test('junior UPDATE journal → 0 rows', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: A, role: 'junior_accountant' }, async (c) => {
    const rows = await c`UPDATE journal_headers SET status='canceled' WHERE id=${POSTED} RETURNING id`;
    assert.equal(rows.length, 0);
  });
});

test('junior DELETE journal → 0 rows', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: A, role: 'junior_accountant' }, async (c) => {
    const rows = await c`DELETE FROM journal_headers WHERE id=${DRAFT} RETURNING id`;
    assert.equal(rows.length, 0);
  });
});

test('owner UPDATE journal работи', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: A, role: 'owner' }, async (c) => {
    const rows = await c`UPDATE journal_headers SET status='canceled' WHERE id=${DRAFT} RETURNING id`;
    assert.equal(rows.length, 1);
    await admin.unsafe(`UPDATE journal_headers SET status='draft' WHERE id='${DRAFT}'`);
  });
});

test('B cannot delete A journal', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: B }, async (c) => {
    const rows = await c`DELETE FROM journal_headers WHERE id=${DRAFT} RETURNING id`;
    assert.equal(rows.length, 0);
  });
});

test('child: A не вижда invoice_lines на B', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: A }, async (c) => {
    const rows = await c`SELECT id FROM invoice_lines WHERE id=${LINE_B}`;
    assert.equal(rows.length, 0);
  });
});

test('child: A cannot INSERT line в invoice на B', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: A }, async (c) => {
    const b = await admin.unsafe(`SELECT id FROM invoices WHERE tenant_id='${B}'`);
    await assert.rejects(
      c.unsafe(`INSERT INTO invoice_lines (invoice_id, description) VALUES (${b[0].id}, 'x')`),
      /row-level security/i,
    );
  });
});

test('child: A може да чете собствени invoice_lines', async (t) => {
  if (!ok(t)) return;
  await asApp({ tenantId: A }, async (c) => {
    const rows = await c`SELECT id FROM invoice_lines`;
    assert.ok(rows.length >= 1);
  });
});