import 'server-only';

import { and, eq, ilike, inArray, ne } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { counterparties } from '@/lib/db/schema/counterparties';
import { employees } from '@/lib/db/schema/employees';
import { expenses } from '@/lib/db/schema/expenses';
import { inventoryItems, inventoryMovements } from '@/lib/db/schema/inventory';
import { invoiceLines, invoices } from '@/lib/db/schema/invoices';
import { tasks } from '@/lib/db/schema/tasks';

export type WriteActionResult = { success: boolean; message: string };

export async function executeCreateInvoice(
  tenantId: string,
  userId: string,
  payload: Record<string, unknown> | null,
): Promise<WriteActionResult> {
  const clientName = String(payload?.clientName ?? '').trim();
  const items = Array.isArray(payload?.items)
    ? (payload.items as Array<{ description: string; quantity: number; unitPrice: number; vatRate?: number }>)
    : [];
  const dueDate = payload?.dueDate ? String(payload.dueDate) : undefined;
  const notes = payload?.notes ? String(payload.notes) : undefined;

  if (!clientName || items.length === 0) {
    return { success: false, message: 'Missing client or invoice line items' };
  }

  let counterparty = await db.query.counterparties.findFirst({
    where: and(eq(counterparties.tenantId, tenantId), ilike(counterparties.name, `%${clientName}%`)),
  });
  if (!counterparty) {
    [counterparty] = await db
      .insert(counterparties)
      .values({ tenantId, name: clientName, type: 'client' })
      .returning();
  }

  let subtotal = 0;
  let vatAmount = 0;
  const lines = items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const vatRate = Number(item.vatRate ?? 20);
    const lineNet = quantity * unitPrice;
    const lineVat = lineNet * (vatRate / 100);
    subtotal += lineNet;
    vatAmount += lineVat;
    return {
      description: String(item.description),
      quantity: quantity.toString(),
      unitPrice: unitPrice.toString(),
      vatRate: vatRate.toString(),
      lineNet: lineNet.toString(),
      lineVat: lineVat.toString(),
      lineTotal: (lineNet + lineVat).toString(),
    };
  });
  const totalAmount = subtotal + vatAmount;
  const invoiceNumber = Math.floor(1_000_000_000 + Math.random() * 9_000_000_000).toString();

  const [invoice] = await db
    .insert(invoices)
    .values({
      tenantId,
      userId,
      invoiceNumber,
      type: 'sale',
      clientName: counterparty.name,
      counterpartyName: counterparty.name,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: dueDate || new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
      status: 'draft',
      notes: notes || 'Създадена след човешко одобрение на AI предложение.',
      subtotal: subtotal.toString(),
      vatAmount: vatAmount.toString(),
      totalAmount: totalAmount.toString(),
      total: totalAmount.toString(),
      aiStatus: 'verified',
      aiConfidence: '0.99',
    })
    .returning();

  await db.insert(invoiceLines).values(lines.map((line) => ({ ...line, invoiceId: invoice.id })));
  return {
    success: true,
    message: `Фактура №${invoice.invoiceNumber} за ${counterparty.name} е създадена като чернова (${totalAmount.toFixed(2)}).`,
  };
}

export async function executeCreateExpense(
  tenantId: string,
  userId: string,
  payload: Record<string, unknown> | null,
): Promise<WriteActionResult> {
  const description = String(payload?.description ?? '').trim();
  const amount = Number(payload?.amount ?? 0);
  const category = String(payload?.category ?? 'Други');
  const expenseDate = payload?.expenseDate ? new Date(String(payload.expenseDate)) : new Date();
  if (!description || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(expenseDate.getTime())) {
    return { success: false, message: 'Invalid expense payload' };
  }

  await db.insert(expenses).values({
    tenantId,
    userId,
    description,
    amount: amount.toString(),
    category,
    expenseDate,
  });
  return { success: true, message: `Разходът „${description}“ за ${amount.toFixed(2)} е записан.` };
}

export async function executeBankMatch(
  tenantId: string,
  payload: Record<string, unknown> | null,
): Promise<WriteActionResult> {
  const threshold = Math.min(1, Math.max(0, Number(payload?.confidenceThreshold ?? 0.8)));
  const accounts = await db.select({ id: bankAccounts.id }).from(bankAccounts).where(eq(bankAccounts.tenantId, tenantId));
  if (accounts.length === 0) return { success: true, message: 'Няма банкови сметки за съгласуване.' };

  const transactions = await db
    .select()
    .from(bankTransactions)
    .where(and(inArray(bankTransactions.accountId, accounts.map((item) => item.id)), eq(bankTransactions.isReconciled, false)));
  const incoming = transactions.filter((item) => Number(item.amount ?? 0) > 0);
  const openInvoices = (await db.select().from(invoices).where(eq(invoices.tenantId, tenantId))).filter(
    (invoice) => invoice.status !== 'paid' && invoice.type === 'sale',
  );

  let matched = 0;
  for (const transaction of incoming) {
    let best: (typeof openInvoices)[number] | undefined;
    let bestScore = 0;
    for (const invoice of openInvoices) {
      let score = Math.abs(Number(transaction.amount) - Number(invoice.totalAmount)) < 0.01 ? 0.6 : 0;
      const description = transaction.description?.toLowerCase() ?? '';
      if (invoice.invoiceNumber && description.includes(invoice.invoiceNumber.toLowerCase())) score += 0.4;
      if (
        invoice.clientName &&
        transaction.counterpartyName?.toLowerCase().includes(invoice.clientName.toLowerCase())
      ) score += 0.2;
      if (score > bestScore) {
        best = invoice;
        bestScore = score;
      }
    }
    if (!best || bestScore < threshold) continue;

    await db
      .update(bankTransactions)
      .set({
        isReconciled: true,
        matchedInvoiceId: best.id,
        matchStatus: 'confirmed',
        matchConfidence: bestScore.toString(),
      })
      .where(eq(bankTransactions.id, transaction.id));
    await db.update(invoices).set({ status: 'paid' }).where(eq(invoices.id, best.id));
    openInvoices.splice(openInvoices.findIndex((item) => item.id === best?.id), 1);
    matched += 1;
  }

  return { success: true, message: `Банково съгласуване: потвърдени ${matched} плащания.` };
}

export async function executeCreateHrTask(
  tenantId: string,
  payload: Record<string, unknown> | null,
): Promise<WriteActionResult> {
  const taskTitle = String(payload?.taskTitle ?? '').trim();
  const assigneeName = payload?.assigneeName ? String(payload.assigneeName).trim() : '';
  if (!taskTitle) return { success: false, message: 'Missing task title' };

  let assignee = 'Неразпределена';
  if (assigneeName) {
    const [employee] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          ilike(employees.firstName, `%${assigneeName}%`),
        ),
      )
      .limit(1);
    if (!employee) return { success: false, message: `Не е намерен служител: ${assigneeName}` };
    assignee = `${employee.firstName} ${employee.lastName}`;
  }

  await db.insert(tasks).values({ tenantId, title: taskTitle, status: 'suggested', priority: 'medium', assignee });
  return { success: true, message: `HR задачата „${taskTitle}“ е създадена за ${assignee}.` };
}

export async function executeManageInventory(
  tenantId: string,
  payload: Record<string, unknown> | null,
): Promise<WriteActionResult> {
  const threshold = Number(payload?.minThreshold ?? 5);
  const items = await db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));
  const movements = await db.select().from(inventoryMovements).where(eq(inventoryMovements.tenantId, tenantId));
  const existingTasks = await db.select().from(tasks).where(eq(tasks.tenantId, tenantId));
  let created = 0;

  for (const item of items) {
    const stock = movements
      .filter((movement) => movement.itemId === item.id)
      .reduce((total, movement) => total + (movement.type === 'in' ? 1 : -1) * Number(movement.quantity), 0);
    if (stock > threshold) continue;
    const title = `СНАБДЯВАНЕ: Изчерпва се „${item.name}“ (остават ${stock})`;
    if (existingTasks.some((task) => task.title === title && task.status !== 'completed')) continue;
    await db.insert(tasks).values({
      tenantId,
      title,
      description: `Наличността е под одобрения праг ${threshold}.`,
      priority: 'high',
      assignee: 'Мениджър Снабдяване',
    });
    created += 1;
  }
  return { success: true, message: `Складова проверка: създадени ${created} задачи за снабдяване.` };
}

export async function executeProcessInbox(tenantId: string): Promise<WriteActionResult> {
  const items = await db
    .select()
    .from(aiInboxItems)
    .where(
      and(
        eq(aiInboxItems.tenantId, tenantId),
        eq(aiInboxItems.status, 'open'),
        ne(aiInboxItems.type, 'ai_approval_required'),
      ),
    );
  if (items.length === 0) return { success: true, message: 'Няма отворени AI inbox елементи за обработка.' };

  await db
    .update(aiInboxItems)
    .set({ status: 'resolved', updatedAt: new Date() })
    .where(inArray(aiInboxItems.id, items.map((item) => item.id)));
  return { success: true, message: `Маркирани като обработени: ${items.length} AI inbox елемента.` };
}
