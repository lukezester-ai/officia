"use server";

import { db } from "@/lib/db/db";
import { bankTransactions } from "@/lib/db/schema/bank_transactions";
import { invoices } from "@/lib/db/schema/invoices";
import { bankAccounts } from "@/lib/db/schema/bank_accounts";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { autoCloseMatchedDocument } from "@/lib/matching/auto-close";
import { requireTenant } from "@/lib/auth/get-tenant";

export async function uploadBankStatement(parsedTransactions: any[]) {
  const { tenantId } = await requireTenant();
  const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.tenantId, tenantId)).limit(1);

  if (!account) return { success: false, error: "Няма банкова сметка за този tenant." };

  const toInsert = parsedTransactions.map(tx => ({
    accountId: account!.id,
    amount: String(tx.amount),
    date: new Date(tx.date),
    description: tx.description,
    counterpartyName: tx.counterpartyName,
    counterpartyIban: tx.counterpartyIban,
    isReconciled: false
  }));

  if (toInsert.length > 0) {
    await db.insert(bankTransactions).values(toInsert);
  }
  
  revalidatePath("/[lang]/dashboard/accounting/reconciliation", "page");
  return { success: true, count: toInsert.length };
}

export async function confirmMatch(transactionId: string, matchType: 'invoice' | 'expense', matchId: string) {
  if (matchType === 'invoice') {
    await db.update(bankTransactions)
      .set({ isReconciled: true, matchedInvoiceId: matchId })
      .where(eq(bankTransactions.id, transactionId));
      
    await db.update(invoices)
      .set({ status: 'paid' })
      .where(eq(invoices.id, matchId));
  } else {
    await db.update(bankTransactions)
      .set({ isReconciled: true, matchedExpenseId: matchId as string })
      .where(eq(bankTransactions.id, transactionId));
  }
  
  await autoCloseMatchedDocument(transactionId);
  
  revalidatePath("/[lang]/dashboard/accounting/reconciliation", "page");
  return { success: true };
}
