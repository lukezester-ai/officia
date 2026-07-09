import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { eq, and, sql } from 'drizzle-orm';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
  if (CRON_SECRET && authHeader !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  try {
    const accounts = await db
      .select({ id: bankAccounts.id, tenantId: bankAccounts.tenantId })
      .from(bankAccounts)
      .where(sql`${bankAccounts.provider} = 'nordigen'`);

    for (const account of accounts) {
      results.push(`found-nordigen-account:${account.id}`);
    }

    return NextResponse.json({
      success: true,
      message: `Cron ran. Found ${accounts.length} Nordigen accounts.`,
      tasks: results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
