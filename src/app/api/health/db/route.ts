import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { getPostgresClientOptions } from '@/lib/db/postgres-client';

export async function GET() {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    return NextResponse.json({
      ok: false,
      reason: 'DATABASE_URL_MISSING',
      message: 'DATABASE_URL is not set in this Render web service runtime.',
    }, { status: 500 });
  }

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
      connection: { database: result.database },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      reason: 'DATABASE_CONNECTION_FAILED',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
