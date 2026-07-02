import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import { getPostgresClientOptions } from '@/lib/db/postgres-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requiredSchema: Record<string, string[]> = {
  users: ['id', 'tenant_id', 'clerk_id', 'email', 'name', 'created_at', 'updated_at'],
  tenants: ['id', 'name', 'plan', 'trial_ends_at', 'created_at', 'updated_at'],
  invoices: ['id', 'tenant_id', 'status', 'total_amount', 'created_at'],
  ai_inbox_items: ['id', 'tenant_id', 'status'],
  approvals: ['id', 'tenant_id', 'status'],
  bank_accounts: ['id', 'tenant_id'],
  bank_transactions: ['id', 'account_id'],
  documents: ['id', 'tenant_id', 'status'],
  tax_declarations: ['id', 'tenant_id', 'status'],
};

const migrationFiles = [
  '0000_init.sql',
  '0001_inventory_product_codes.sql',
  '0002_tenant_billing.sql',
  '0003_rls_rbac_nap_bank.sql',
  '0004_ai_memory_rag.sql',
  '0005_payroll.sql',
  '0006_hr_core_upgrade.sql',
  '0007_payroll_rate_components.sql',
  '0008_auth_users_safety.sql',
];

function maskDatabaseUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) parsed.password = '***';
    if (parsed.username) parsed.username = parsed.username.slice(0, 3) + '***';
    return {
      host: parsed.host,
      database: parsed.pathname.replace(/^\//, ''),
      sslmode: parsed.searchParams.get('sslmode'),
      masked: parsed.toString(),
    };
  } catch {
    return { host: null, database: null, sslmode: null, masked: 'invalid-url-format' };
  }
}

async function applyMigrationFile(sql: postgres.Sql, fileName: string) {
  const filePath = path.join(process.cwd(), 'drizzle', 'migrations', fileName);
  const content = await fs.readFile(filePath, 'utf8');
  const statements = content
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    try {
      await sql.unsafe(statement);
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      const message = error instanceof Error ? error.message : String(error);
      const isAlreadyApplied =
        code === '42710' ||
        code === '42P07' ||
        code === '42701' ||
        /already exists/i.test(message);

      if (!isAlreadyApplied) {
        throw error;
      }
    }
  }
}

async function applyFreshDatabaseMigrations(sql: postgres.Sql) {
  for (const fileName of migrationFiles) {
    await applyMigrationFile(sql, fileName);
  }
}

async function inspectSchema(sql: postgres.Sql) {
  const rows = await sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
  `;

  const present = new Map<string, Set<string>>();
  for (const row of rows) {
    const table = String(row.table_name);
    const column = String(row.column_name);
    if (!present.has(table)) present.set(table, new Set());
    present.get(table)!.add(column);
  }

  const checks = Object.entries(requiredSchema).map(([table, columns]) => {
    const tableColumns = present.get(table);
    return {
      table,
      exists: Boolean(tableColumns),
      missingColumns: tableColumns ? columns.filter((column) => !tableColumns.has(column)) : columns,
    };
  });

  const failed = checks.filter((check) => !check.exists || check.missingColumns.length > 0);
  return { checks, failed };
}

export async function GET() {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    return NextResponse.json(
      { ok: false, reason: 'DATABASE_URL_MISSING', message: 'DATABASE_URL is not set.' },
      { status: 500 },
    );
  }

  const { url, options } = getPostgresClientOptions(rawUrl);
  const sql = postgres(url, {
    ...options,
    max: 1,
    connect_timeout: 8,
    idle_timeout: 5,
    onnotice: () => {},
  });

  try {
    let repaired = false;
    let { checks, failed } = await inspectSchema(sql);

    if (failed.some((check) => !check.exists)) {
      await applyFreshDatabaseMigrations(sql);
      repaired = true;
      ({ checks, failed } = await inspectSchema(sql));
    }

    const [dbInfo] = await sql`select current_database() as database, current_user as user`;

    return NextResponse.json({
      ok: failed.length === 0,
      repaired,
      databaseUrl: maskDatabaseUrl(rawUrl),
      connection: dbInfo,
      failed,
      checks,
    }, { status: failed.length === 0 ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      reason: 'APP_HEALTH_CHECK_FAILED',
      databaseUrl: maskDatabaseUrl(rawUrl),
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}
