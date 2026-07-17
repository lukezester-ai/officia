import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { autoCloseMatchedDocument } from '@/lib/matching/auto-close';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { bankTxId, journalLineId, invoiceId } = await req.json();

    if (!bankTxId) {
      return Response.json({ success: false, error: "Липсва bankTxId" }, { status: 400 });
    }

    const matchId = invoiceId || journalLineId;

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
