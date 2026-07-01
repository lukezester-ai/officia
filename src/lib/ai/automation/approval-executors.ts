import { db } from '@/lib/db/db';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { employees } from '@/lib/db/schema/employees';
import { fixedAssets } from '@/lib/db/schema/fixed_assets';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import {
  executeBankMatch,
  executeCreateExpense,
  executeCreateHrTask,
  executeCreateInvoice,
  executeManageInventory,
  executeProcessInbox,
} from './write-actions';

type ExecutionResult = { success: boolean; message: string };

export async function executeApprovedAction(
  actionKey: string,
  tenantId: string,
  userId: string,
  payload: Record<string, unknown> | null,
): Promise<ExecutionResult> {
  switch (actionKey) {
    case 'createInvoice':
      return executeCreateInvoice(tenantId, userId, payload);
    case 'createExpense':
      return executeCreateExpense(tenantId, userId, payload);
    case 'bankMatch':
      return executeBankMatch(tenantId, payload);
    case 'manageHR.createTask':
      return executeCreateHrTask(tenantId, payload);
    case 'manageInventory':
      return executeManageInventory(tenantId, payload);
    case 'processInbox':
      return executeProcessInbox(tenantId);
    case 'createJournalEntry':
      return executeCreateJournalEntry(tenantId, userId, payload);
    case 'autoApprove':
      return executeAutoApprove(tenantId, userId, payload);
    case 'depreciateAssets':
      return executeDepreciateAssets(tenantId, userId, payload);
    case 'generateVat':
      return executeGenerateVat(tenantId, payload);
    default:
      return { success: false, message: `Непознато действие: ${actionKey}` };
  }
}

async function executeCreateJournalEntry(
  tenantId: string,
  userId: string,
  payload: Record<string, unknown> | null,
): Promise<ExecutionResult> {
  const description = String(payload?.description ?? '');
  const amount = Number(payload?.amount ?? 0);
  const debitAccountCode = String(payload?.debitAccountCode ?? '');
  const creditAccountCode = String(payload?.creditAccountCode ?? '');
  const date = payload?.date ? String(payload.date) : undefined;

  if (!description || !amount || !debitAccountCode || !creditAccountCode) {
    return { success: false, message: 'Липсват данни за счетоводната статия.' };
  }

  const entryDate = date ? new Date(date) : new Date();

  const getOrCreateAccount = async (codeOrName: string) => {
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
  };

  const debitAcc = await getOrCreateAccount(debitAccountCode);
  const creditAcc = await getOrCreateAccount(creditAccountCode);
  const randomNum = `JE-${Math.floor(10000 + Math.random() * 90000)}`;

  const [header] = await db
    .insert(journalHeaders)
    .values({
      tenantId,
      journalNumber: randomNum,
      entryDate,
      description,
      postedBy: userId,
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
      amount: amount.toString(),
      description,
    },
    {
      journalId: header.id,
      accountId: creditAcc.id,
      entryType: 'credit',
      amount: amount.toString(),
      description,
    },
  ]);

  return {
    success: true,
    message: `Създадена счетоводна статия #${header.journalNumber}: Дебит ${debitAcc.accountNumber}, Кредит ${creditAcc.accountNumber}, ${amount} лв.`,
  };
}

async function executeAutoApprove(
  tenantId: string,
  userId: string,
  payload: Record<string, unknown> | null,
): Promise<ExecutionResult> {
  const requestIds = Array.isArray(payload?.requestIds) ? (payload.requestIds as string[]) : [];

  const pendingRequests = requestIds.length
    ? await db
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
        .where(and(eq(leaveRequests.tenantId, tenantId), eq(leaveRequests.status, 'pending')))
    : await db
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

  if (pendingRequests.length === 0) {
    return { success: true, message: 'Няма чакащи молби за отпуска.' };
  }

  let approvedCount = 0;
  let skippedCount = 0;

  for (const req of pendingRequests) {
    if (requestIds.length && !requestIds.includes(req.id)) continue;

    if (!req.department) {
      skippedCount++;
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
      continue;
    }

    await db
      .update(leaveRequests)
      .set({ status: 'approved', approvedBy: userId })
      .where(eq(leaveRequests.id, req.id));
    approvedCount++;
  }

  return {
    success: true,
    message: `Одобрени: ${approvedCount}, отложени: ${skippedCount} от общо ${pendingRequests.length} молби.`,
  };
}

async function executeDepreciateAssets(
  tenantId: string,
  userId: string,
  payload: Record<string, unknown> | null,
): Promise<ExecutionResult> {
  const year = Number(payload?.year);
  const month = Number(payload?.month);

  if (!year || !month) {
    return { success: false, message: 'Липсва година или месец.' };
  }

  const assets = await db
    .select()
    .from(fixedAssets)
    .where(and(eq(fixedAssets.tenantId, tenantId), eq(fixedAssets.isActive, true)));

  if (assets.length === 0) {
    return { success: true, message: 'Няма активни ДМА за амортизация.' };
  }

  const journalDate = new Date(year, month, 0);
  const [header] = await db
    .insert(journalHeaders)
    .values({
      tenantId,
      journalNumber: `DEP-${year}${month.toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
      entryDate: journalDate,
      description: `Амортизации на ДМА за месец ${month}/${year}`,
      postedBy: userId,
      status: 'posted',
      aiStatus: 'verified',
      aiConfidence: '0.99',
    })
    .returning();

  const linesToInsert: Array<{
    journalId: string;
    accountId: string | null;
    entryType: string;
    amount: string;
    description: string;
  }> = [];
  let totalDepreciation = 0;
  let processedAssets = 0;

  for (const asset of assets) {
    const cost = parseFloat(asset.acquisitionCost || '0');
    const months = parseFloat(asset.usefulLifeMonths || '1');
    if (months <= 0) continue;

    const monthlyDepreciation = cost / months;
    totalDepreciation += monthlyDepreciation;
    processedAssets++;

    linesToInsert.push(
      {
        journalId: header.id,
        accountId: asset.expenseAccountId,
        entryType: 'debit',
        amount: monthlyDepreciation.toFixed(2),
        description: `Амортизация: ${asset.name}`,
      },
      {
        journalId: header.id,
        accountId: asset.amortizationAccountId,
        entryType: 'credit',
        amount: monthlyDepreciation.toFixed(2),
        description: `Амортизация: ${asset.name}`,
      },
    );
  }

  const defaultExpenseAccount = await db.query.accountPlan.findFirst({
    where: and(eq(accountPlan.tenantId, tenantId), eq(accountPlan.accountNumber, '603')),
  });
  const defaultAmortAccount = await db.query.accountPlan.findFirst({
    where: and(eq(accountPlan.tenantId, tenantId), eq(accountPlan.accountNumber, '241')),
  });

  for (const line of linesToInsert) {
    if (!line.accountId) {
      if (line.entryType === 'debit' && defaultExpenseAccount) line.accountId = defaultExpenseAccount.id;
      else if (line.entryType === 'credit' && defaultAmortAccount) line.accountId = defaultAmortAccount.id;
    }
  }

  const validLines = linesToInsert.flatMap((l) => {
    if (!l.accountId) return [];
    return [{
      journalId: l.journalId,
      accountId: l.accountId,
      entryType: l.entryType as 'debit' | 'credit',
      amount: l.amount,
      description: l.description,
    }];
  });

  if (validLines.length === 0) {
    return { success: false, message: 'Липсват счетоводни сметки за амортизация (603/241).' };
  }

  await db.insert(journalLines).values(validLines);

  return {
    success: true,
    message: `Амортизации за ${month}/${year}: ${processedAssets} ДМА, общо ${totalDepreciation.toFixed(2)} лв., статия #${header.journalNumber}.`,
  };
}

async function executeGenerateVat(
  tenantId: string,
  payload: Record<string, unknown> | null,
): Promise<ExecutionResult> {
  const year = Number(payload?.year);
  const month = Number(payload?.month);
  const startDate = String(payload?.startDate ?? '');
  const endDate = String(payload?.endDate ?? '');

  if (!year || !month || !startDate || !endDate) {
    return { success: false, message: 'Липсват данни за периода на ДДС дневника.' };
  }

  const sales = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        sql`${invoices.issueDate} >= ${startDate} AND ${invoices.issueDate} <= ${endDate}`,
      ),
    );

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
    .where(
      and(
        eq(vatJournals.tenantId, tenantId),
        eq(vatJournals.periodYear, year),
        eq(vatJournals.periodMonth, month),
      ),
    );

  let totalVatSales = 0;
  let totalVatPurchases = 0;
  const today = new Date().toISOString().slice(0, 10);
  const journalsToInsert = [];

  for (const s of sales) {
    totalVatSales += parseFloat(s.vatAmount || '0');
    journalsToInsert.push({
      tenantId,
      type: 'sales',
      periodYear: year,
      periodMonth: month,
      entryDate: today,
      documentNumber: s.invoiceNumber,
      counterpartyName: s.clientName,
      counterpartyVat: s.clientVatNumber,
      invoiceNumber: s.invoiceNumber,
      invoiceDate: s.issueDate,
      netAmount: s.netAmount,
      vatAmount: s.vatAmount,
      totalAmount: s.totalAmount,
      vatRate: 20,
    });
  }

  for (const p of purchases) {
    totalVatPurchases += parseFloat(p.vatAmount || '0');
    journalsToInsert.push({
      tenantId,
      type: 'purchases',
      periodYear: year,
      periodMonth: month,
      entryDate: today,
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
  const resultText =
    resultVat > 0
      ? `ДДС за внасяне: ${resultVat.toFixed(2)} лв.`
      : `ДДС за възстановяване: ${Math.abs(resultVat).toFixed(2)} лв.`;

  return {
    success: true,
    message: `ДДС дневници за ${month}/${year}: ${sales.length} продажби, ${purchases.length} покупки. ${resultText}`,
  };
}
