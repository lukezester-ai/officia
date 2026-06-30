"use server";

import { db } from "@/lib/db/db";
import { bankTransactions } from "@/lib/db/schema/bank_transactions";
import { invoices } from "@/lib/db/schema/invoices";
import { bankAccounts } from "@/lib/db/schema/bank_accounts";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/get-tenant";
import { assertFeature, getTenantBilling } from "@/lib/billing/enforcement";

export async function uploadBankStatement(parsedTransactions: any[]) {
  const { tenantId } = await requireTenant();
  const billing = await getTenantBilling(tenantId);
  if (billing) {
    const gate = assertFeature(billing, "bankSync");
    if (!gate.ok) return { success: false, error: gate.error };
  }

  let account = await db.query.bankAccounts.findFirst({
    where: eq(bankAccounts.tenantId, tenantId),
  });

  if (!account) {
    const res = await db
      .insert(bankAccounts)
      .values({
        tenantId,
        institutionName: "Основна банкова сметка",
        iban: "BG00XXXX00000000000000",
        currency: "EUR",
        balance: "0",
      })
      .returning();
    account = res[0];
  }

  if (!account) return { success: false, error: "No bank account found" };

  const toInsert = parsedTransactions.map((tx) => ({
    accountId: account!.id,
    amount: String(tx.amount),
    date: new Date(tx.date),
    description: tx.description,
    counterpartyName: tx.counterpartyName,
    counterpartyIban: tx.counterpartyIban,
    isReconciled: false,
  }));

  if (toInsert.length > 0) {
    await db.insert(bankTransactions).values(toInsert);
  }

  revalidatePath("/[lang]/dashboard/accounting/reconciliation", "page");
  return { success: true, count: toInsert.length };
}

export async function confirmMatch(
  transactionId: string,
  matchType: "invoice" | "expense",
  matchId: string | number,
) {
  const { tenantId } = await requireTenant();

  if (matchType === "invoice") {
    const invoiceId = Number(matchId);
    const [invoice] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

    if (!invoice) return { success: false, error: "Фактурата не е намерена" };

    await db
      .update(bankTransactions)
      .set({ isReconciled: true, matchedInvoiceId: invoiceId })
      .where(eq(bankTransactions.id, transactionId));

    await db.update(invoices).set({ status: "paid" }).where(eq(invoices.id, invoiceId));
  } else {
    await db
      .update(bankTransactions)
      .set({ isReconciled: true, matchedExpenseId: matchId as string })
      .where(eq(bankTransactions.id, transactionId));
  }

  revalidatePath("/[lang]/dashboard/accounting/reconciliation", "page");
  return { success: true };
}
