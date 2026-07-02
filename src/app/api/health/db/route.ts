import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { getPostgresClientOptions } from '@/lib/db/postgres-client';

function maskDatabaseUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) parsed.password = '***';
    if (parsed.username) parsed.username = parsed.username.slice(0, 3) + '***';
    return {
      protocol: parsed.protocol,
      host: parsed.host,
      database: parsed.pathname.replace(/^\//, ''),
      sslmode: parsed.searchParams.get('sslmode'),
      masked: parsed.toString(),
    };
  } catch {
    return {
      protocol: null,
      host: null,
      database: null,
      sslmode: null,
      masked: 'invalid-url-format',
    };
  }
}

export async function GET() {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    return NextResponse.json({
      ok: false,
      reason: 'DATABASE_URL_MISSING',
      message: 'DATABASE_URL is not set in this Render web service runtime.',
    }, { status: 500 });
  }

  const details = maskDatabaseUrl(rawUrl);

  try {
    const { url, options } = getPostgresClientOptions(rawUrl);
    const sql = postgres(url, {
      ...options,
      max: 1,
      connect_timeout: 10,
      onnotice: () => {},
    });

    const [result] = await sql`select current_database() as database, current_user as user`;
    await sql.end({ timeout: 5 });

    return NextResponse.json({
      ok: true,
      databaseUrl: details,
      connection: result,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      reason: 'DATABASE_CONNECTION_FAILED',
      databaseUrl: details,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
