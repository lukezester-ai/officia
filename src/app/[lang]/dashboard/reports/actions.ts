'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { requireTenant } from '@/lib/auth/get-tenant';
import { getInvoiceEffectiveAmount } from '@/lib/utils/invoice-amount';
import { buildInvoiceSnapshot, sharePercent, sofiaToday, type InvoiceSnapshot } from '@/lib/reports/invoice-snapshot';

export type ReportsView = InvoiceSnapshot & {
  docsCount: number;
  analyzedDocsCount: number;
  recognizedPercent: number | null;
  transactionsCount: number;
  reconciledCount: number;
  reconciledPercent: number | null;
  allDocs: { id: string; title: string; type: string; status: string; createdAt: string }[];
};

function emptySnapshot(): InvoiceSnapshot {
  return buildInvoiceSnapshot({ sales: [], purchases: [], today: sofiaToday() });
}

function emptyView(): ReportsView {
  return {
    ...emptySnapshot(),
    docsCount: 0,
    analyzedDocsCount: 0,
    recognizedPercent: null,
    transactionsCount: 0,
    reconciledCount: 0,
    reconciledPercent: null,
    allDocs: [],
  };
}

export async function getReportsData(): Promise<{ success: boolean; error?: string; data: ReportsView }> {
  try {
    const { tenantId } = await requireTenant();
    const [salesRows, purchaseRows] = await Promise.all([
      db.select({
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        totalAmount: invoices.totalAmount,
        total: invoices.total,
        amount: invoices.amount,
        netAmount: invoices.netAmount,
        vatAmount: invoices.vatAmount,
      }).from(invoices).where(eq(invoices.tenantId, tenantId)),
      db.select({
        status: purchaseInvoices.status,
        issueDate: purchaseInvoices.issueDate,
        dueDate: purchaseInvoices.dueDate,
        totalAmount: purchaseInvoices.totalAmount,
      }).from(purchaseInvoices).where(eq(purchaseInvoices.tenantId, tenantId)),
    ]);

    const snapshot = buildInvoiceSnapshot({
      today: sofiaToday(),
      sales: salesRows.map((row) => ({
        amount: getInvoiceEffectiveAmount(row),
        issueDate: row.issueDate,
        dueDate: row.dueDate,
        status: row.status,
      })),
      purchases: purchaseRows.map((row) => ({
        amount: Number(row.totalAmount) || 0,
        issueDate: row.issueDate,
        dueDate: row.dueDate,
        status: row.status,
      })),
    });

    const { documents } = await import('@/lib/db/schema/documents');
    const { bankAccounts } = await import('@/lib/db/schema/bank_accounts');
    const { bankTransactions } = await import('@/lib/db/schema/bank_transactions');

    const allDocs = await db.select({
      id: documents.id,
      title: documents.title,
      type: documents.type,
      status: documents.status,
      aiStatus: documents.aiStatus,
      createdAt: documents.createdAt,
    }).from(documents).where(eq(documents.tenantId, tenantId));

    const txRows = await db.select({
      isReconciled: bankTransactions.isReconciled,
      matchStatus: bankTransactions.matchStatus,
    }).from(bankTransactions)
      .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
      .where(eq(bankAccounts.tenantId, tenantId));

    const analyzedDocsCount = allDocs.filter((doc) => doc.aiStatus === 'processed' || doc.status === 'analyzed').length;
    const reconciledCount = txRows.filter((row) => row.isReconciled || row.matchStatus === 'confirmed').length;

    return {
      success: true,
      data: {
        ...snapshot,
        docsCount: allDocs.length,
        analyzedDocsCount,
        recognizedPercent: sharePercent(analyzedDocsCount, allDocs.length),
        transactionsCount: txRows.length,
        reconciledCount,
        reconciledPercent: sharePercent(reconciledCount, txRows.length),
        allDocs: allDocs.slice(0, 10).map((doc) => ({
          id: doc.id,
          title: doc.title || 'Документ',
          type: doc.type || 'invoice',
          status: doc.status || 'pending_analysis',
          createdAt: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('bg-BG') : '—',
        })),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Неуспешно зареждане';
    return { success: false, error: message, data: emptyView() };
  }
}
