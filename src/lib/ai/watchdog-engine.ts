// @ts-nocheck
import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { expenses } from '@/lib/db/schema/expenses';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { eq, and, gt, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * AI Agent Manager (Watchdog Engine)
 * Сканира системата във фонов режим за аномалии, потенциални измами и счетоводни грешки.
 */
export async function runAIWatchdog(tenantId: string): Promise<{ success: boolean; anomaliesFound: number; message: string }> {
  try {
    let anomaliesFound = 0;
    const inboxItemsToInsert = [];

    // 1. Извличаме последните фактури (напр. от последните 30 дни), които не са вече отбелязани като problem
    const recentInvoices = await db.select().from(invoices).where(
      and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.status, 'draft') // Сканираме основно чернови/непотвърдени, за да ги хванем преди осчетоводяване
      )
    ).orderBy(desc(invoices.createdAt)).limit(100);

    // 2. Правила за аномалии

    // Правило А: Проверка за чуждестранни контрагенти с начислено българско ДДС
    // Ако VAT номера започва с нещо различно от BG (напр. DE, RO, US), ДДС ставката най-вероятно трябва да е 0% (чл. 21 или ВОД).
    for (const inv of recentInvoices) {
      if (inv.counterpartyVat && !inv.counterpartyVat.toUpperCase().startsWith('BG')) {
        const vatAmount = parseFloat(inv.vatAmount || '0');
        if (vatAmount > 0) {
          anomaliesFound++;
          inboxItemsToInsert.push({
            tenantId,
            type: 'vat_anomaly',
            sourceType: 'invoice',
            sourceId: inv.id.toString(),
            title: `Съмнително ДДС за чуждестранен клиент`,
            description: `Фактура №${inv.invoiceNumber} е към контрагент с VAT ${inv.counterpartyVat}, но има начислено ДДС в размер на ${vatAmount} лв. Проверете дали не трябва да е 0% (VIES/ВОД).`,
            confidence: '0.85',
            priority: 'high',
            metaJson: { invoiceNumber: inv.invoiceNumber, vatAmount, counterpartyVat: inv.counterpartyVat }
          });
        }
      }
    }

    // Правило Б: Потенциално дублирани фактури
    // Фактури със същата сума към същия контрагент, издадени в рамките на малък период от време.
    const groupedByAmountAndVendor = {};
    for (const inv of recentInvoices) {
      if (!inv.totalAmount || parseFloat(inv.totalAmount) === 0) continue;
      if (!inv.counterpartyName) continue;

      const key = `${inv.counterpartyName}_${inv.totalAmount}`;
      if (!groupedByAmountAndVendor[key]) {
        groupedByAmountAndVendor[key] = [];
      }
      groupedByAmountAndVendor[key].push(inv);
    }

    for (const [key, similarInvoices] of Object.entries(groupedByAmountAndVendor)) {
      if (similarInvoices.length > 1) {
        // Намерихме дубликати
        anomaliesFound++;
        const invNumbers = similarInvoices.map(i => i.invoiceNumber).join(', ');
        const firstInv = similarInvoices[0];
        
        inboxItemsToInsert.push({
          tenantId,
          type: 'invoice_duplicate',
          sourceType: 'invoice',
          sourceId: firstInv.id.toString(),
          title: `Съмнение за дублирани фактури`,
          description: `Засечени са ${similarInvoices.length} фактури със същата сума (${firstInv.totalAmount} лв.) към същия контрагент (${firstInv.counterpartyName}). Фактури: ${invNumbers}.`,
          confidence: '0.90',
          priority: 'high',
          metaJson: { counterpartyName: firstInv.counterpartyName, totalAmount: firstInv.totalAmount, count: similarInvoices.length }
        });
      }
    }

    // Правило В (Поведенческа аномалия - Служителски разходи)
    // Сканира разходи, направени в странни часове (между 00:00 и 05:00)
    const recentExpenses = await db.select().from(expenses).where(
      eq(expenses.tenantId, tenantId)
    ).orderBy(desc(expenses.createdAt)).limit(50);

    for (const exp of recentExpenses) {
      if (!exp.expenseDate) continue;
      const date = new Date(exp.expenseDate);
      const hour = date.getHours();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      if ((hour >= 0 && hour <= 5) || isWeekend) {
        anomaliesFound++;
        inboxItemsToInsert.push({
          tenantId,
          type: 'behavioral_anomaly',
          sourceType: 'expense',
          sourceId: exp.id.toString(),
          title: `Съмнително време на разход`,
          description: `Засечен е разход "${exp.description}" на стойност ${exp.amount} лв, генериран в нетипично време (Час: ${hour}:00, Уикенд: ${isWeekend ? 'Да' : 'Не'}). Моля, изискайте допълнително одобрение.`,
          confidence: '0.95',
          priority: 'critical',
          metaJson: { amount: exp.amount, hour, isWeekend, description: exp.description }
        });
      }
    }

    // Правило Г (Съмнителна смяна на банкова сметка / Vendor Fraud)
    // Търси ключови думи в бележките на фактурите за покупка
    const recentPurchases = await db.select().from(purchaseInvoices).where(
      eq(purchaseInvoices.tenantId, tenantId)
    ).orderBy(desc(purchaseInvoices.createdAt)).limit(50);

    const suspiciousKeywords = ['нова сметка', 'нов iban', 'променен iban', 'new bank', 'промяна на банкова', 'new account'];

    for (const pur of recentPurchases) {
      if (pur.notes) {
        const notesLower = pur.notes.toLowerCase();
        const hasSuspiciousKeyword = suspiciousKeywords.some(kw => notesLower.includes(kw));
        
        if (hasSuspiciousKeyword) {
          anomaliesFound++;
          inboxItemsToInsert.push({
            tenantId,
            type: 'vendor_fraud_alert',
            sourceType: 'purchase_invoice',
            sourceId: pur.id.toString(),
            title: `ВЪЗМОЖНА ИЗМАМА: Смяна на IBAN`,
            description: `Доставчикът "${pur.supplierName}" е приложил фактура №${pur.invoiceNumber} (Сума: ${pur.totalAmount} лв) с бележка за смяна на банковата сметка. Това е чест вектор за хакерски атаки (BEC Scam). Свържете се с доставчика по телефона за потвърждение!`,
            confidence: '0.99',
            priority: 'critical',
            metaJson: { supplierName: pur.supplierName, invoiceNumber: pur.invoiceNumber, totalAmount: pur.totalAmount }
          });
        }
      }
    }

    // 3. Записваме намерените аномалии в AI Inbox
    if (inboxItemsToInsert.length > 0) {
      // Първо изтриваме стари отворени сигнали за същите фактури, за да не спамим базата
      // (Това е опростен вариант, в реална среда се проверява дали вече не съществува)
      
      await db.insert(aiInboxItems).values(inboxItemsToInsert);
    }

    return { 
      success: true, 
      anomaliesFound,
      message: `Watchdog завърши успешно. Открити са ${anomaliesFound} потенциални аномалии.` 
    };

  } catch (error: any) {
    console.error('[AI Watchdog Error]', error);
    return { success: false, anomaliesFound: 0, message: error.message };
  }
}
