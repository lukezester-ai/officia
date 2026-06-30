import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { assertFeature, getTenantBilling } from '@/lib/billing/enforcement';
import { db } from '@/lib/db/db';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { getAccountTransactions } from '@/lib/banking/nordigen';
import { eq, and } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { tenantId } = await requireTenant();
    const billing = await getTenantBilling(tenantId);
    if (billing) {
      const gate = assertFeature(billing, 'bankSync');
      if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const accountId = body.accountId as string | undefined;

    const accounts = accountId
      ? await db
          .select()
          .from(bankAccounts)
          .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.id, accountId)))
      : await db.select().from(bankAccounts).where(eq(bankAccounts.tenantId, tenantId));

    let imported = 0;

    for (const account of accounts) {
      if (account.provider !== 'nordigen' || !account.externalAccountId) continue;

      const txData = await getAccountTransactions(account.externalAccountId);
      const booked = txData.transactions?.booked || [];

      for (const tx of booked) {
        const externalId = tx.transactionId || `${account.id}-${tx.bookingDate}-${tx.transactionAmount?.amount}`;
        try {
          await db.insert(bankTransactions).values({
            accountId: account.id,
            transactionId: externalId,
            amount: tx.transactionAmount?.amount || '0',
            currency: tx.transactionAmount?.currency || account.currency || 'EUR',
            date: tx.bookingDate ? new Date(tx.bookingDate) : new Date(),
            description: tx.remittanceInformationUnstructured || 'Bank transaction',
            counterpartyName: tx.debtorName || tx.creditorName || null,
            isReconciled: false,
          });
          imported += 1;
        } catch {
          // duplicate transaction_id — skip
        }
      }
    }

    return NextResponse.json({ success: true, imported });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
