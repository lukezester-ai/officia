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
import { runStatutoryDeadlineCronEngine } from "@/lib/calendar/deadline-rule-engine";
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

  runStatutoryDeadlineCronEngine(tenantId).catch(() => {});

  const [tenantInvoices, tenantPurchases, openInbox, pendingApprovals, txForReview, docsForReview] = await Promise.all([
    db.select().from(invoices).where(eq(invoices.tenantId, tenantId)),
    db.select().from(purchaseInvoices).where(eq(purchaseInvoices.tenantId, tenantId)),
    db.select().from(aiInboxItems).where(and(eq(aiInboxItems.tenantId, tenantId), eq(aiInboxItems.status, "open"))),
    db.select().from(approvals).where(and(eq(approvals.tenantId, tenantId), eq(approvals.status, "pending"))),
    db.select({ id: bankTransactions.id })
      .from(bankTransactions)
      .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
      .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankTransactions.reviewRequired, true))),
    db.select().from(documents).where(and(eq(documents.tenantId, tenantId), eq(documents.aiStatus, "needs_review"))),
  ]);

  const unpaidInvoices = tenantInvoices.filter((i) => !PAID.has(i.status || "") && !CANCELLED.has(i.status || ""));
  const invoicesForReview = tenantInvoices.filter((i) => i.aiStatus === "needs_review");
  const dueInvoices = tenantInvoices.filter((i) => {
    if (PAID.has(i.status || "") || CANCELLED.has(i.status || "") || !i.dueDate) return false;
    return new Date(i.dueDate).getTime() <= Date.now();
  });
  const vatIssues = tenantInvoices.filter((i) => i.einvoiceStatus === "error").length;

  const revenue = tenantInvoices
    .filter((i) => PAID.has(i.status || ""))
    .reduce((sum, i) => sum + getInvoiceEffectiveAmount(i), 0);
  const expenses = tenantPurchases
    .filter((p) => !CANCELLED.has(p.status || ""))
    .reduce((sum, p) => sum + money(p.totalAmount), 0);

  return {
    overviewStats: {
      revenue,
      expenses,
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
