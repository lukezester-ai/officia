import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { autoCloseMatchedDocument } from '@/lib/matching/auto-close';
import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireTenant();
    const { bankTxId, journalLineId, invoiceId } = await req.json();

    if (!bankTxId) {
      return Response.json({ success: false, error: "Липсва bankTxId" }, { status: 400 });
    }

    const matchId = invoiceId || journalLineId;

    const [ownedTransaction] = await db.select({ id: bankTransactions.id })
      .from(bankTransactions)
      .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
      .where(and(
        eq(bankTransactions.id, bankTxId),
        eq(bankAccounts.tenantId, tenantId),
      ))
      .limit(1);

    if (!ownedTransaction) {
      return Response.json({ success: false, error: 'Транзакцията не е намерена' }, { status: 404 });
    }

    await db.update(bankTransactions)
      .set({ 
        isReconciled: true,
        matchedInvoiceId: matchId ? Number(matchId) || matchId : null
      } as any)
      .where(eq(bankTransactions.id, bankTxId));

    await autoCloseMatchedDocument(bankTxId);

    return Response.json({ success: true, message: "Транзакцията е успешно съпоставена и фактурата е затворена!" });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
