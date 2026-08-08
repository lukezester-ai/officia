// ============================================================================
// Static contract: Drizzle schema <-> RLS SQL (rls.sql).
// Библиотека: node:test. Бърз и без БД — работи и в CI без Postgres.
// Цел: всяка ALTER/POLICY/child-референция от rls.sql да сочи към РЕАЛНИ
// таблици и колони от src/lib/db/schema/*, включително FK child-типове
// (integer↔integer, uuid↔uuid, text↔text).
// Schema се разчита с regex от Drizzle декларациите (без TS компилация).
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_DIR = path.resolve('src/lib/db/schema');

// ---- 1) parse drizzle tables & their columns -------------------------------
function parseSchema() {
  const tables = {};
  for (const f of fs.readdirSync(SCHEMA_DIR).filter(p => p.endsWith('.ts'))) {
    const src = fs.readFileSync(path.join(SCHEMA_DIR, f), 'utf8');
    const re = /pgTable\(\s*['"]([a-z_]+)['"]\s*,\s*\{([\s\S]*?)\n\}\)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const name = m[1];
      const body = m[2];
      const columns = {};
      const colRe = /:\s*([a-z]+)\(\s*['"]([a-z_]+)['"]/g;
      let cm;
      while ((cm = colRe.exec(body)) !== null) {
        columns[cm[2]] = cm[1]; // dbColName -> sql type token
      }
      tables[name] = columns;
    }
  }
  return tables;
}

// ---- 2) extract references from rls.sql -------------------------------------
function parseRls(sql) {
  const targets = new Set();
  const dotted = new Set();
  let m;

  // ALTER TABLE <t> ENABLE ... и CREATE POLICY ...
  const reAlter = /ALTER TABLE\s+([a-z][a-z_]+)/g;
  while ((m = reAlter.exec(sql)) !== null) targets.add(m[1]);

  const rePolicy = /CREATE POLICY\s+[\w]+\s+ON\s+([a-z][a-z_]+)/g;
  while ((m = rePolicy.exec(sql)) !== null) targets.add(m[1]);

  // всяко тable.column — с пресяване на еднобуквените SQL alias (h, p, b, i, n, r, f)
  const reDot = /([a-z][a-z_]{2,})\.([a-z_]{1,})/g;
  while ((m = reDot.exec(sql)) !== null) {
    if (/(\.(ts|js|sql|mjs))$/i.test(m[0])) continue; // не е референция, а име на файл
    const t = m[1];
    if (t === 'app') continue; // app.current_tenant_id GUC префикс
    if (t.length <= 2) continue; // еднобуквени/двубуквени aliases
    dotted.add(`${t}.${m[2]}`);
  }

  return { targets: [...targets], dotted: [...dotted] };
}

const sql = fs.readFileSync(path.resolve('src/lib/db/rls.sql'), 'utf8');
const tables = parseSchema();
const rls = parseRls(sql);

test('всяка таблица от rls.sql съществува в Drizzle schema', () => {
  const missing = rls.targets.filter(t => !tables[t]);
  assert.deepEqual(missing, [], 'rls.sql targets not in schema: ' + missing.join(', '));
});

test('всяко table.col референция от rls.sql има column в schema', () => {
  const bad = [];
  for (const ref of rls.dotted) {
    const [t, c] = ref.split('.');
    if (!tables[t] || !(c in tables[t])) bad.push(ref);
  }
  assert.deepEqual(bad, [], 'rls.sql references missing table.column: ' + bad.join(', '));
});

test('child FK типове съвпадат с parent PK (int↔int, uuid↔uuid, text↔text)', () => {
  const expectFk = [
    ['journal_lines', 'journal_id', 'journal_headers', 'id'],
    ['invoice_lines', 'invoice_id', 'invoices', 'id'],
    ['purchase_invoice_lines', 'invoice_id', 'purchase_invoices', 'id'],
    ['payroll_slip_items', 'run_id', 'payroll_runs', 'id'],
    ['depreciation_logs', 'run_id', 'depreciation_runs', 'id'],
    ['accounting_periods', 'fiscal_year_id', 'fiscal_years', 'id'],
    ['nap_access_log', 'integration_id', 'nap_integrations', 'id'],
    ['bank_transactions', 'account_id', 'bank_accounts', 'id'],
  ];
  const norm = (x) => (x === 'serial' ? 'integer' : (x ?? ''));
  const bad = [];
  for (const [child, ccol, parent, pcol] of expectFk) {
    if (!tables[child] || !tables[parent]) { bad.push(`${child}.${ccol}→${parent}`); continue; }
    const ct = norm(tables[child][ccol]);
    const pt = norm(tables[parent][pcol]);
    if (ct !== pt) bad.push(`${child}.${ccol} (${ct}) !== ${parent}.${pcol} (${pt})`);
  }
  assert.deepEqual(bad, [], 'FK type mismatch: ' + bad.join('; '));
});

test('tenant_id е с правилния тип: uuid таблици — uuid, text таблици — text', () => {
  const bad = [];
  for (const [t, cols] of Object.entries(tables)) {
    if (!cols.tenant_id) continue;
    const isText = ['purchase_invoices', 'tax_declarations', 'financial_reports'].includes(t);
    const expect = isText ? 'text' : 'uuid';
    if (cols.tenant_id !== expect) bad.push(`${t}.tenant_id=${cols.tenant_id} (очаква се ${expect})`);
  }
  assert.deepEqual(bad, [], bad.join('; '));
});