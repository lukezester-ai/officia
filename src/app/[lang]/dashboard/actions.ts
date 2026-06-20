"use server";

import { db } from "@/lib/db/db";
import { invoices } from "@/lib/db/schema/invoices";
import { aiInboxItems } from "@/lib/db/schema/ai_inbox";
import { approvals } from "@/lib/db/schema/approvals";
import { bankTransactions } from "@/lib/db/schema/bank_transactions";
import { documents } from "@/lib/db/schema/documents";
import { eq, desc, and, isNull } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { users } from "@/lib/db/schema/users";

async function getTenantId() {
  const { userId, orgId } = await auth();
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  return user?.tenantId || null;
}

export async function getDashboardData() {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error("Unauthorized");

  // Overview Stats
  // 1. Unpaid invoices count
  const unpaidInvoices = await db.select().from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, "draft"))); // Treat draft/pending as unpaid for now
  
  // 2. Open inbox items
  const openInbox = await db.select().from(aiInboxItems).where(and(eq(aiInboxItems.tenantId, tenantId), eq(aiInboxItems.status, "open")));
  
  // 3. Pending approvals
  const pendingApprovals = await db.select().from(approvals).where(and(eq(approvals.tenantId, tenantId), eq(approvals.status, "pending")));

  // Needs Review Block
  const invoicesForReview = await db.select().from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.aiStatus, "needs_review")));
  const txForReview = await db.select().from(bankTransactions).where(eq(bankTransactions.reviewRequired, true)); // Needs proper join with accounts to filter by tenant, but simplified for now
  
  // Upcoming Deadlines
  // Simplified logic, e.g. due dates in the next 7 days
  const dueInvoices = await db.select().from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, "draft")));

  return {
    overviewStats: {
      revenue: 12500.50, // mock
      expenses: 4320.00, // mock
      unpaidInvoices: unpaidInvoices.length,
      approvalsPending: pendingApprovals.length,
      inboxOpenItems: openInbox.length,
    },
    needsReview: {
      invoices: invoicesForReview.length,
      transactions: txForReview.length,
      documents: 2, // mock
      vatIssues: 1, // mock
    },
    upcomingDeadlines: {
      dueInvoices: dueInvoices.length,
      expiringDocs: 1, // mock
    },
    aiRecommendations: openInbox.slice(0, 5) // Top 5
  };
}
