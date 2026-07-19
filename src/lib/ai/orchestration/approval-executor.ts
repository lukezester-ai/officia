// @ts-nocheck
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { fixedAssets } from '@/lib/db/schema/fixed_assets';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { employees } from '@/lib/db/schema/employees';
import { publishAiEvent } from './events';

type ExecuteResult = { success: boolean; message: string; data?: unknown };

async function getOrCreateAccount(tenantId: string, codeOrName: string) {
  let acc = await db.query.accountPlan.findFirst({
    where: and(
      eq(accountPlan.tenantId, tenantId),
      or(eq(accountPlan.accountNumber, codeOrName), ilike(accountPlan.name, `%${codeOrName}%`)),
    ),
  });

  if (!acc) {
    const isNum = /^\d+$/.test(codeOrName);
    const [newAcc] = await db
      .insert(accountPlan)
      .values({
        tenantId,
        accountNumber: isNum ? codeOrName : Math.floor(100 + Math.random() * 899).toString(),
        name: isNum ? `Сметка ${codeOrName}` : codeOrName,
        type: 'expense',
      })
      .returning();
    acc = newAcc;
  }
  return acc;
}

export async function executeCreateJournalEntry(
  tenantId: string,
  userId: string | null | undefined,
  payload: {
    description: string;
    amount: number;
    debitAccountCode: string;
    creditAccountCode: string;
    date?: string;
  },
): Promise<ExecuteResult> {
  const entryDate = payload.date ? new Date(payload.date) : new Date();
  const debitAcc = await getOrCreateAccount(tenantId, payload.debitAccountCode);
  const creditAcc = await getOrCreateAccount(tenantId, payload.creditAccountCode);
  const randomNum = `JE-${Math.floor(10000 + Math.random() * 90000)}`;

  const [header] = await db
    .insert(journalHeaders)
    .values({
      tenantId,
      journalNumber: randomNum,
      entryDate,
      description: payload.description,
      postedBy: userId || 'ai',
      status: 'posted',
      aiStatus: 'verified',
      aiConfidence: '0.90',
    })
    .returning();

  await db.insert(journalLines).values([
    {
      journalId: header.id,
      accountId: debitAcc.id,
      entryType: 'debit',
      amount: payload.amount.toString(),
      description: payload.description,
    },
    {
      journalId: header.id,
      accountId: creditAcc.id,
      entryType: 'credit',
      amount: payload.amount.toString(),
      description: payload.description,
    },
  ]);

  return {
    success: true,
    message: `Осчетоводена статия #${header.journalNumber}: Дт ${debitAcc.accountNumber} / Кт ${creditAcc.accountNumber} (${payload.amount})`,
    data: { journalId: header.id, journalNumber: header.journalNumber },
  };
}

export async function executeGenerateVat(
  tenantId: string,
  payload: { year: number; month: number; startDate?: string; endDate?: string },
): Promise<ExecuteResult> {
  const year = payload.year;
  const month = payload.month;
  const startDate = payload.startDate || new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = payload.endDate || new Date(year, month, 0).toISOString().split('T')[0];

  const sales = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.tenantId, tenantId), sql`${invoices.issueDate} >= ${startDate} AND ${invoices.issueDate} <= ${endDate}`));

  const purchases = await db
    .select()
    .from(purchaseInvoices)
    .where(
      and(
        eq(purchaseInvoices.tenantId, tenantId),
        sql`${purchaseInvoices.issueDate} >= ${startDate} AND ${purchaseInvoices.issueDate} <= ${endDate}`,
      ),
    );

  await db
    .delete(vatJournals)
    .where(and(eq(vatJournals.tenantId, tenantId), eq(vatJournals.periodYear, year), eq(vatJournals.periodMonth, month)));

  let totalVatSales = 0;
  let totalVatPurchases = 0;
  const journalsToInsert = [];

  for (const s of sales) {
    const vat = parseFloat(s.vatAmount || '0');
    totalVatSales += vat;
    journalsToInsert.push({
      tenantId,
      type: 'sales',
      periodYear: year,
      periodMonth: month,
      entryDate: new Date(),
      documentNumber: s.invoiceNumber,
      counterpartyName: s.clientName,
      counterpartyVat: s.clientVat,
      invoiceNumber: s.invoiceNumber,
      invoiceDate: s.issueDate,
      netAmount: s.netAmount,
      vatAmount: s.vatAmount,
      totalAmount: s.totalAmount,
      vatRate: 20,
    });
  }

  for (const p of purchases) {
    const vat = parseFloat(p.vatAmount || '0');
    totalVatPurchases += vat;
    journalsToInsert.push({
      tenantId,
      type: 'purchases',
      periodYear: year,
      periodMonth: month,
      entryDate: new Date(),
      documentNumber: p.invoiceNumber,
      counterpartyName: p.supplierName,
      counterpartyVat: p.supplierVat,
      invoiceNumber: p.invoiceNumber,
      invoiceDate: p.issueDate,
      netAmount: p.netAmount,
      vatAmount: p.vatAmount,
      totalAmount: p.totalAmount,
      vatRate: 20,
    });
  }

  if (journalsToInsert.length > 0) {
    await db.insert(vatJournals).values(journalsToInsert);
  }

  const resultVat = totalVatSales - totalVatPurchases;
  return {
    success: true,
    message: `ДДС дневници за ${month}/${year}: продажби ${sales.length}, покупки ${purchases.length}. Резултат: ${resultVat.toFixed(2)} EUR`,
    data: { salesCount: sales.length, purchasesCount: purchases.length, resultVat },
  };
}

export async function executeDepreciateAssets(
  tenantId: string,
  userId: string | null | undefined,
  payload: { year: number; month: number; assetIds?: string[] },
): Promise<ExecuteResult> {
  const assets = await db
    .select()
    .from(fixedAssets)
    .where(and(eq(fixedAssets.tenantId, tenantId), eq(fixedAssets.isActive, true)));

  if (assets.length === 0) {
    return { success: true, message: 'Няма активни ДМА за амортизация.' };
  }

  const year = payload.year;
  const month = payload.month;
  const journalDate = new Date(year, month, 0);

  const [header] = await db
    .insert(journalHeaders)
    .values({
      tenantId,
      journalNumber: `DEP-${year}${month.toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
      entryDate: journalDate,
      description: `Автоматично начислени амортизации на ДМА за месец ${month}/${year}`,
      postedBy: userId || 'ai',
      status: 'posted',
      aiStatus: 'verified',
      aiConfidence: '0.99',
    })
    .returning();

  const defaultExpenseAccount = await db.query.accountPlan.findFirst({
    where: and(eq(accountPlan.tenantId, tenantId), eq(accountPlan.accountNumber, '603')),
  });
  const defaultAmortAccount = await db.query.accountPlan.findFirst({
    where: and(eq(accountPlan.tenantId, tenantId), eq(accountPlan.accountNumber, '241')),
  });

  let linesToInsert = [];
  let totalDepreciation = 0;
  let processedAssets = 0;

  for (const asset of assets) {
    if (payload.assetIds?.length && !payload.assetIds.includes(asset.id)) continue;
    const cost = parseFloat(asset.acquisitionCost || '0');
    const months = parseFloat(asset.usefulLifeMonths || '1');
    if (months <= 0) continue;

    const monthlyDepreciation = cost / months;
    totalDepreciation += monthlyDepreciation;
    processedAssets++;

    linesToInsert.push({
      journalId: header.id,
      accountId: asset.expenseAccountId || defaultExpenseAccount?.id,
      entryType: 'debit',
      amount: monthlyDepreciation.toFixed(2),
      description: `Амортизация: ${asset.name}`,
    });
    linesToInsert.push({
      journalId: header.id,
      accountId: asset.amortizationAccountId || defaultAmortAccount?.id,
      entryType: 'credit',
      amount: monthlyDepreciation.toFixed(2),
      description: `Амортизация: ${asset.name}`,
    });
  }

  linesToInsert = linesToInsert.filter((l) => l.accountId);
  if (linesToInsert.length === 0) {
    return { success: false, message: 'Липсват сметки 603/241 в сметкоплана за амортизации.' };
  }

  await db.insert(journalLines).values(linesToInsert);

  return {
    success: true,
    message: `Амортизации ${month}/${year}: ${processedAssets} ДМА, общо ${totalDepreciation.toFixed(2)} EUR (#${header.journalNumber})`,
    data: { journalId: header.id, processedAssets, totalDepreciation },
  };
}

export async function executeAutoApproveLeaves(
  tenantId: string,
  userId: string | null | undefined,
  payload: { requestIds?: string[] },
): Promise<ExecuteResult> {
  const pendingRequests = await db
    .select({
      id: leaveRequests.id,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      employeeId: leaveRequests.employeeId,
      firstName: employees.firstName,
      lastName: employees.lastName,
      department: employees.department,
    })
    .from(leaveRequests)
    .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .where(and(eq(leaveRequests.tenantId, tenantId), eq(leaveRequests.status, 'pending')));

  const targets = payload.requestIds?.length
    ? pendingRequests.filter((r) => payload.requestIds!.includes(r.id))
    : pendingRequests;

  let approvedCount = 0;
  let skippedCount = 0;
  const details: string[] = [];

  for (const req of targets) {
    if (!req.department) {
      skippedCount++;
      details.push(`Пропусната: ${req.firstName} ${req.lastName} (няма отдел)`);
      continue;
    }

    const conflicting = await db
      .select()
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(
        and(
          eq(leaveRequests.tenantId, tenantId),
          eq(leaveRequests.status, 'approved'),
          eq(employees.department, req.department),
          sql`${leaveRequests.startDate} <= ${req.endDate}`,
          sql`${leaveRequests.endDate} >= ${req.startDate}`,
        ),
      );

    if (conflicting.length > 0) {
      skippedCount++;
      details.push(`Отложена: ${req.firstName} ${req.lastName} — конфликт в отдел ${req.department}`);
      continue;
    }

    await db
      .update(leaveRequests)
      .set({ status: 'approved', approvedBy: userId || 'ai' })
      .where(eq(leaveRequests.id, req.id));
    approvedCount++;
    details.push(`Одобрена: ${req.firstName} ${req.lastName}`);
  }

  return {
    success: true,
    message: `HR: одобрени ${approvedCount}, отложени ${skippedCount}.`,
    data: { approvedCount, skippedCount, details },
  };
}

const ACTION_EXECUTORS: Record<
  string,
  (tenantId: string, userId: string | null | undefined, payload: any) => Promise<ExecuteResult>
> = {
  createJournalEntry: (t, u, p) => executeCreateJournalEntry(t, u, p),
  generateVat: (t, _u, p) => executeGenerateVat(t, p),
  depreciateAssets: (t, u, p) => executeDepreciateAssets(t, u, p),
  autoApprove: (t, u, p) => executeAutoApproveLeaves(t, u, p),
};

/**
 * Resolve an AI approval inbox item: accept → run stored payload; reject → close.
 */
export async function resolveAiApproval(input: {
  tenantId: string;
  userId?: string | null;
  approvalId: string;
  decision: 'accepted' | 'rejected';
  note?: string;
}): Promise<ExecuteResult> {
  const [item] = await db
    .select()
    .from(aiInboxItems)
    .where(
      and(
        eq(aiInboxItems.id, input.approvalId),
        eq(aiInboxItems.tenantId, input.tenantId),
        eq(aiInboxItems.type, 'ai_approval_required'),
      ),
    )
    .limit(1);

  if (!item) {
    return { success: false, message: 'Approval request not found.' };
  }

  if (item.status !== 'open') {
    return { success: false, message: `Approval already ${item.status}.` };
  }

  const meta = (item.metaJson || {}) as {
    actionKey?: string;
    payload?: unknown;
    correlationId?: string;
  };

  if (input.decision === 'rejected') {
    await db
      .update(aiInboxItems)
      .set({
        status: 'rejected',
        updatedAt: new Date(),
        metaJson: { ...meta, rejectedBy: input.userId ?? null, note: input.note ?? null },
      })
      .where(eq(aiInboxItems.id, item.id));

    await publishAiEvent({
      type: 'approval.rejected',
      tenantId: input.tenantId,
      userId: input.userId,
      correlationId: meta.correlationId || item.id,
      sourceType: 'ai_approval',
      sourceId: item.id,
      message: `Отхвърлено: ${item.title}`,
      payload: { actionKey: meta.actionKey, note: input.note },
    });

    return { success: true, message: `Отхвърлено: ${item.title}` };
  }

  const actionKey = meta.actionKey;
  const executor = actionKey ? ACTION_EXECUTORS[actionKey] : null;
  if (!executor) {
    await db
      .update(aiInboxItems)
      .set({
        status: 'accepted',
        updatedAt: new Date(),
        metaJson: { ...meta, acceptedBy: input.userId ?? null, note: 'No executor — marked accepted only' },
      })
      .where(eq(aiInboxItems.id, item.id));
    return {
      success: true,
      message: `Одобрено без автоматично изпълнение (няма executor за ${actionKey || 'unknown'}).`,
    };
  }

  const result = await executor(input.tenantId, input.userId, meta.payload || {});

  await db
    .update(aiInboxItems)
    .set({
      status: result.success ? 'resolved' : 'open',
      updatedAt: new Date(),
      metaJson: {
        ...meta,
        acceptedBy: input.userId ?? null,
        executionResult: result,
        note: input.note ?? null,
      },
    })
    .where(eq(aiInboxItems.id, item.id));

  await publishAiEvent({
    type: 'approval.accepted',
    tenantId: input.tenantId,
    userId: input.userId,
    correlationId: meta.correlationId || item.id,
    sourceType: 'ai_approval',
    sourceId: item.id,
    message: result.message,
    payload: { actionKey, result },
  });

  return result;
}
