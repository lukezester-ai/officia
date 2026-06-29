"use server";

import { db } from "@/lib/db/db";
import { invoices } from "@/lib/db/schema/invoices";
import { aiInboxItems } from "@/lib/db/schema/ai_inbox";
import { approvals } from "@/lib/db/schema/approvals";
import { bankTransactions } from "@/lib/db/schema/bank_transactions";
import { bankAccounts } from "@/lib/db/schema/bank_accounts";
import { documents } from "@/lib/db/schema/documents";
import { taxDeclarations } from "@/lib/db/schema/tax_declarations";
import { eq, and, inArray, or } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/get-tenant";
import { getCurrentMonthFinancialSummary } from "@/lib/financial/period-summary";

const UNPAID_STATUSES = ["issued", "sent", "pending", "издадена", "изпратена"];

export async function getDashboardData() {
  const { tenantId } = await requireTenant();

  const [
    unpaidInvoices,
    openInbox,
    pendingApprovals,
    invoicesForReview,
    txForReview,
    documentsForReview,
    draftTaxDeclarations,
    financials,
  ] = await Promise.all([
    db
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), inArray(invoices.status, UNPAID_STATUSES))),
    db
      .select()
      .from(aiInboxItems)
      .where(and(eq(aiInboxItems.tenantId, tenantId), eq(aiInboxItems.status, "open"))),
    db
      .select()
      .from(approvals)
      .where(and(eq(approvals.tenantId, tenantId), eq(approvals.status, "pending"))),
    db
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.aiStatus, "needs_review"))),
    db
      .select({ tx: bankTransactions })
      .from(bankTransactions)
      .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
      .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankTransactions.reviewRequired, true))),
    db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, tenantId),
          or(eq(documents.aiStatus, "needs_review"), eq(documents.status, "pending_analysis")),
        ),
      ),
    db
      .select()
      .from(taxDeclarations)
      .where(and(eq(taxDeclarations.tenantId, tenantId), eq(taxDeclarations.status, "draft"))),
    getCurrentMonthFinancialSummary(tenantId),
  ]);

  return {
    overviewStats: {
      revenue: financials.revenue,
      expenses: financials.expenses,
      netProfit: financials.netProfit,
      periodLabel: `${financials.start} – ${financials.end}`,
      unpaidInvoices: unpaidInvoices.length,
      approvalsPending: pendingApprovals.length,
      inboxOpenItems: openInbox.length,
    },
    needsReview: {
      invoices: invoicesForReview.length,
      transactions: txForReview.length,
      documents: documentsForReview.length,
      vatIssues: draftTaxDeclarations.length,
    },
    upcomingDeadlines: {
      dueInvoices: unpaidInvoices.length,
      expiringDocs: documentsForReview.length,
    },
    aiRecommendations: openInbox.slice(0, 5),
  };
}
