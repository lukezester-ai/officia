"use server";

import { db } from "@/lib/db/db";
import { invoices } from "@/lib/db/schema/invoices";
import { aiInboxItems } from "@/lib/db/schema/ai_inbox";
import { approvals } from "@/lib/db/schema/approvals";
import { bankTransactions } from "@/lib/db/schema/bank_transactions";
import { bankAccounts } from "@/lib/db/schema/bank_accounts";
import { documents } from "@/lib/db/schema/documents";
import { taxDeclarations } from "@/lib/db/schema/tax_declarations";
import { eq, and, inArray, or, sql } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/get-tenant";
import { getCurrentMonthFinancialSummary } from "@/lib/financial/period-summary";
import { getCachedData } from "@/lib/cache/cache-manager";

const UNPAID_STATUSES = ["issued", "sent", "pending", "издадена", "изпратена"];

async function quickCount(table: any, column: any, tenantId: string, ...extra: any[]) {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(table)
    .where(and(eq(column, tenantId), ...extra));
  return Number(row?.count ?? 0);
}

export async function getDashboardData() {
  const { tenantId } = await requireTenant();

  const cached = await getCachedData(
    `dashboard:${tenantId}`,
    async () => {
      const [
        unpaidCount,
        pendingApprovals,
        reviewInvoices,
        reviewDocs,
        financials,
        inboxItems,
      ] = await Promise.all([
        quickCount(invoices, invoices.tenantId, tenantId, inArray(invoices.status, UNPAID_STATUSES)),
        quickCount(approvals, approvals.tenantId, tenantId, eq(approvals.status, "pending")),
        quickCount(invoices, invoices.tenantId, tenantId, eq(invoices.aiStatus, "needs_review")),
        quickCount(documents, documents.tenantId, tenantId, or(eq(documents.aiStatus, "needs_review"), eq(documents.status, "pending_analysis"))),
        getCurrentMonthFinancialSummary(tenantId),
        db
          .select()
          .from(aiInboxItems)
          .where(and(eq(aiInboxItems.tenantId, tenantId), eq(aiInboxItems.status, "open")))
          .limit(5),
      ]);

      const [txCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bankTransactions)
        .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
        .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankTransactions.reviewRequired, true)));

      const [draftCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(taxDeclarations)
        .where(and(eq(taxDeclarations.tenantId, tenantId), eq(taxDeclarations.status, "draft")));

      return {
        overviewStats: {
          revenue: financials.revenue,
          expenses: financials.expenses,
          netProfit: financials.netProfit,
          periodLabel: `${financials.start} – ${financials.end}`,
          unpaidInvoices: unpaidCount,
          approvalsPending: pendingApprovals,
          inboxOpenItems: inboxItems.length,
        },
        needsReview: {
          invoices: reviewInvoices,
          transactions: Number(txCount?.count ?? 0),
          documents: reviewDocs,
          vatIssues: Number(draftCount?.count ?? 0),
        },
        upcomingDeadlines: {
          dueInvoices: unpaidCount,
          expiringDocs: reviewDocs,
        },
        aiRecommendations: inboxItems,
      };
    },
    30,
  );

  return cached;
}
