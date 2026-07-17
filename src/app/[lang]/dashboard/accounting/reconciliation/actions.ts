// @ts-nocheck
"use server";

import { db } from "@/lib/db/db";
import { bankTransactions } from "@/lib/db/schema/bank_transactions";
import { invoices } from "@/lib/db/schema/invoices";
import { bankAccounts } from "@/lib/db/schema/bank_accounts";
import { tenants } from "@/lib/db/schema/tenants";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { autoCloseMatchedDocument } from "@/lib/matching/auto-close";

export async function uploadBankStatement(parsedTransactions: any[]) {
  const tenant = await db.query.tenants.findFirst();
  let account = await db.query.bankAccounts.findFirst();

  if (!account && tenant) {
    const res = await db.insert(bankAccounts).values({
      tenantId: tenant.id,
      accountName: "Main Bank Account",
      iban: "BG12 UNCR 1234 5678 9012 34",
      currency: "EUR",
      balance: "0",
    }).returning();
    account = res[0];
  }

  if (!account) return { success: false, error: "No bank account or tenant found" };

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

export async function confirmMatch(transactionId: string, matchType: 'invoice' | 'expense', matchId: string | number) {
  if (matchType === 'invoice') {
    await db.update(bankTransactions)
      .set({ isReconciled: true, matchedInvoiceId: matchId as number })
      .where(eq(bankTransactions.id, transactionId));
      
    await db.update(invoices)
      .set({ status: 'paid' })
      .where(eq(invoices.id, matchId as number));
  } else {
    await db.update(bankTransactions)
      .set({ isReconciled: true, matchedExpenseId: matchId as string })
      .where(eq(bankTransactions.id, transactionId));
  }
  
  await autoCloseMatchedDocument(transactionId);
  
  revalidatePath("/[lang]/dashboard/accounting/reconciliation", "page");
  return { success: true };
}
