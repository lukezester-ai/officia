import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { getPostgresClientOptions } from '@/lib/db/postgres-client';

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
    const [dbInfo] = await sql`select current_database() as database, current_user as user`;

    return NextResponse.json({
      ok: failed.length === 0,
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
