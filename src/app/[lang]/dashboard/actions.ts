"use server";

import { db } from "@/lib/db/db";
import { invoices } from "@/lib/db/schema/invoices";
import { aiInboxItems } from "@/lib/db/schema/ai_inbox";
import { approvals } from "@/lib/db/schema/approvals";
import { bankTransactions } from "@/lib/db/schema/bank_transactions";
import { eq, desc, and } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/get-tenant";

export async function getDashboardData() {
  const { tenantId } = await requireTenant();
  if (!tenantId) throw new Error("Unauthorized");

  // Run all independent queries in parallel to eliminate sequential loading delays
  const [tenantInvoices, openInbox, pendingApprovals, txForReview] = await Promise.all([
    db.select().from(invoices).where(eq(invoices.tenantId, tenantId)),
    db.select().from(aiInboxItems).where(and(eq(aiInboxItems.tenantId, tenantId), eq(aiInboxItems.status, "open"))),
    db.select().from(approvals).where(and(eq(approvals.tenantId, tenantId), eq(approvals.status, "pending"))),
    db.select().from(bankTransactions).where(eq(bankTransactions.reviewRequired, true))
  ]);

  // Filter in memory in <1ms instead of making 3 separate DB roundtrips
  const unpaidInvoices = tenantInvoices.filter(i => i.status === "draft" || i.status === "pending");
  const invoicesForReview = tenantInvoices.filter(i => i.aiStatus === "needs_review");
  const dueInvoices = tenantInvoices.filter(i => i.status === "draft");

  return {
    overviewStats: {
      revenue: 12500.50, // mock fallback if needed
      expenses: 4320.00, // mock fallback if needed
      unpaidInvoices: unpaidInvoices.length,
      approvalsPending: pendingApprovals.length,
      inboxOpenItems: openInbox.length,
    },
    needsReview: {
      invoices: invoicesForReview.length,
      transactions: txForReview.length,
      documents: 2,
      vatIssues: 1,
    },
    upcomingDeadlines: {
      dueInvoices: dueInvoices.length,
      expiringDocs: 1,
    },
    aiRecommendations: openInbox.slice(0, 5)
  };
}
