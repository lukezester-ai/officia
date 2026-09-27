"use server";

import { db } from "@/lib/db/db";
import { bankTransactions } from "@/lib/db/schema/bank_transactions";
import { invoices } from "@/lib/db/schema/invoices";
import { expenses } from "@/lib/db/schema/expenses";
import { bankAccounts } from "@/lib/db/schema/bank_accounts";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { autoCloseMatchedDocument } from "@/lib/matching/auto-close";
import { requireTenant } from "@/lib/auth/get-tenant";
import { parseUuidParam } from "@/lib/utils/ids";

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
  const { tenantId } = await requireTenant();

  const [owned] = await db
    .select({ id: bankTransactions.id })
    .from(bankTransactions)
    .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
    .where(and(
      eq(bankTransactions.id, transactionId),
      eq(bankAccounts.tenantId, tenantId),
    ))
    .limit(1);

  if (!owned) {
    throw new Error("Транзакцията не е намерена");
  }

  if (matchType === "invoice") {
    const updated = await db.update(invoices)
      .set({ status: "paid" })
      .where(and(eq(invoices.id, matchId), eq(invoices.tenantId, tenantId)))
      .returning({ id: invoices.id });
    if (updated.length === 0) {
      throw new Error("Фактурата не е намерена");
    }
    await db.update(bankTransactions)
      .set({ isReconciled: true, matchedInvoiceId: matchId })
      .where(eq(bankTransactions.id, transactionId));
  } else {
    const [expense] = await db.select({ id: expenses.id }).from(expenses).where(and(
      eq(expenses.id, matchId),
      eq(expenses.tenantId, tenantId),
    )).limit(1);
    if (!expense) {
      throw new Error("Разходът не е намерен");
    }
    await db.update(bankTransactions)
      .set({ isReconciled: true, matchedExpenseId: matchId })
      .where(eq(bankTransactions.id, transactionId));
  }

  const closed = await autoCloseMatchedDocument(transactionId);
  if (!closed.success) {
    throw new Error(closed.error || "Равнението не мина");
  }
  
  revalidatePath("/[lang]/dashboard/accounting/reconciliation", "page");
  return { success: true };
}

export async function rejectSuggestion(transactionId: string) {
  try {
    const { tenantId } = await requireTenant();
    const id = parseUuidParam(transactionId);
    if (!id) return { success: false as const, error: "Невалидно движение." };

    const [owned] = await db
      .select({
        id: bankTransactions.id,
        matchStatus: bankTransactions.matchStatus,
        isReconciled: bankTransactions.isReconciled,
      })
      .from(bankTransactions)
      .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
      .where(and(
        eq(bankTransactions.id, id),
        eq(bankAccounts.tenantId, tenantId),
      ))
      .limit(1);

    if (!owned) return { success: false as const, error: "Движението не е намерено." };
    if (owned.isReconciled) return { success: false as const, error: "Движението вече е равнено." };
    if (owned.matchStatus === "rejected") return { success: true as const, already: true };

    await db.update(bankTransactions).set({
      matchStatus: "rejected",
      matchedInvoiceId: null,
      matchedExpenseId: null,
      reviewRequired: false,
      isReconciled: false,
    }).where(eq(bankTransactions.id, owned.id));

    revalidatePath("/", "layout");
    return { success: true as const, already: false };
  } catch (error) {
    console.error("[reject-suggestion]", error);
    return { success: false as const, error: "Предложението не беше отхвърлено." };
  }
}
