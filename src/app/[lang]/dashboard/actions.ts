"use server";

import { db } from "@/lib/db/db";
import { invoices } from "@/lib/db/schema/invoices";
import { purchaseInvoices } from "@/lib/db/schema/purchase-invoices";
import { aiInboxItems } from "@/lib/db/schema/ai_inbox";
import { approvals } from "@/lib/db/schema/approvals";
import { bankTransactions } from "@/lib/db/schema/bank_transactions";
import { bankAccounts } from "@/lib/db/schema/bank_accounts";
import { documents } from "@/lib/db/schema/documents";
import { eq, and } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/get-tenant";
import { cache } from "react";
import { getInvoiceEffectiveAmount } from "@/lib/utils/invoice-amount";

const PAID = new Set(["paid", "платена"]);
const CANCELLED = new Set(["cancelled", "canceled", "void", "storno"]);

function money(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export const getDashboardData = cache(async () => {
  const { tenantId } = await requireTenant();
  if (!tenantId) throw new Error("Unauthorized");

  const [tenantInvoices, tenantPurchases, openInbox, pendingApprovals, txForReview, docsForReview] = await Promise.all([
    db
      .select({
        id: invoices.id,
        status: invoices.status,
        dueDate: invoices.dueDate,
        aiStatus: invoices.aiStatus,
        einvoiceStatus: invoices.einvoiceStatus,
        subtotal: invoices.subtotal,
        netAmount: invoices.netAmount,
        vatAmount: invoices.vatAmount,
        amount: invoices.amount,
        total: invoices.total,
        totalAmount: invoices.totalAmount,
      })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId)),
    db
      .select({
        id: purchaseInvoices.id,
        status: purchaseInvoices.status,
        totalAmount: purchaseInvoices.totalAmount,
      })
      .from(purchaseInvoices)
      .where(eq(purchaseInvoices.tenantId, tenantId)),
    db
      .select({
        id: aiInboxItems.id,
        title: aiInboxItems.title,
        description: aiInboxItems.description,
      })
      .from(aiInboxItems)
      .where(and(eq(aiInboxItems.tenantId, tenantId), eq(aiInboxItems.status, "open")))
      .limit(20),
    db
      .select({ id: approvals.id })
      .from(approvals)
      .where(and(eq(approvals.tenantId, tenantId), eq(approvals.status, "pending"))),
    db
      .select({ id: bankTransactions.id })
      .from(bankTransactions)
      .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
      .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankTransactions.reviewRequired, true))),
    db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.tenantId, tenantId), eq(documents.aiStatus, "needs_review"))),
  ]);

  const unpaidInvoices = tenantInvoices.filter((i) => !PAID.has(i.status || "") && !CANCELLED.has(i.status || ""));
  const invoicesForReview = tenantInvoices.filter((i) => i.aiStatus === "needs_review");
  const dueInvoices = tenantInvoices.filter((i) => {
    if (PAID.has(i.status || "") || CANCELLED.has(i.status || "") || !i.dueDate) return false;
    return new Date(i.dueDate).getTime() <= Date.now();
  });
  const vatIssues = tenantInvoices.filter((i) => i.einvoiceStatus === "error").length;

  const billed = tenantInvoices.filter((i) => i.status === "issued" || PAID.has(i.status || ""));
  const outstanding = tenantInvoices.filter((i) => i.status === "issued");
  const revenue = billed.reduce((sum, i) => sum + getInvoiceEffectiveAmount(i), 0);
  const outstandingAmount = outstanding.reduce((sum, i) => sum + getInvoiceEffectiveAmount(i), 0);
  const expenses = tenantPurchases
    .filter((p) => p.status === "approved" || p.status === "paid")
    .reduce((sum, p) => sum + money(p.totalAmount), 0);

  return {
    overviewStats: {
      revenue,
      expenses,
      outstandingCount: outstanding.length,
      outstandingAmount,
      unpaidInvoices: unpaidInvoices.length,
      approvalsPending: pendingApprovals.length,
      inboxOpenItems: openInbox.length,
    },
    needsReview: {
      invoices: invoicesForReview.length,
      transactions: txForReview.length,
      documents: docsForReview.length,
      vatIssues,
    },
    upcomingDeadlines: {
      dueInvoices: dueInvoices.length,
      expiringDocs: 0,
    },
    aiRecommendations: openInbox.slice(0, 5)
  };
});
