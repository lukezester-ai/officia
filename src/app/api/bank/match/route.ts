import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { bankTxId, journalLineId } = await req.json();

    if (!bankTxId) {
      return Response.json({ success: false, error: "Липсва bankTxId" }, { status: 400 });
    }

    // Маркиране на транзакцията като съпоставена.
    // Тук в реално приложение ще се свърже bankTransactionId с journalLineId (invoice / expense).
    await db.update(bankTransactions)
      .set({ isReconciled: true })
      .where(eq(bankTransactions.id, bankTxId));

    return Response.json({ success: true, message: "Транзакцията е успешно съпоставена!" });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
