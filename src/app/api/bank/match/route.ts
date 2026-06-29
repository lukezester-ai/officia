import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { getAuthenticatedTenant } from '@/lib/auth/api-tenant';
import { findBankTransactionForTenant } from '@/lib/banking/tenant-transactions';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedTenant();
    if (!auth.ok) return auth.response;

    const { bankTxId, journalLineId } = await req.json();

    if (!bankTxId) {
      return Response.json({ success: false, error: 'Липсва bankTxId' }, { status: 400 });
    }

    const transaction = await findBankTransactionForTenant(auth.tenantId, bankTxId);

    if (!transaction) {
      return Response.json({ success: false, error: 'Транзакцията не е намерена' }, { status: 404 });
    }

    await db.update(bankTransactions).set({ isReconciled: true }).where(eq(bankTransactions.id, bankTxId));

    return Response.json({
      success: true,
      message: 'Транзакцията е успешно съпоставена!',
      journalLineId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
