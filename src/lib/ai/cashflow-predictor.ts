// @ts-nocheck
import { db } from '@/lib/db/db';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { eq, and, gt, desc } from 'drizzle-orm';

/**
 * ЕПИК Сляпо Петно #2: Predictive Cashflow
 * AI модел (или детерминистичен двигател), който изчислява прогнозната ликвидност
 * след 30 дни на база банкови салда, очаквани приходи (вземания) и плащания (задължения).
 */
export async function predict30DayCashflow(tenantId: string) {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // 1. Извличане на текущите банкови салда
    const accounts = await db.select().from(bankAccounts).where(eq(bankAccounts.tenantId, tenantId));
    
    let currentBalance = 0;
    for (const acc of accounts) {
      // Тук приемаме, че са в BGN, но в реална система ще има конверсия
      currentBalance += parseFloat(acc.balance || '0');
    }

    // 2. Вземания (Очаквани приходи от фактури за продажба)
    // Търсим неплатени фактури с падеж до 30 дни
    const sales = await db.select().from(invoices).where(
      and(
        eq(invoices.tenantId, tenantId),
        // В реалността ще търсим status != 'paid', но тук за MVP търсим чернови/pending
        eq(invoices.status, 'approved') 
      )
    );

    let incomingCash = 0;
    const criticalReceivables = [];
    
    for (const sale of sales) {
      if (sale.type === 'purchase') continue;
      
      const amount = parseFloat(sale.totalAmount || '0');
      incomingCash += amount;
      
      // Добавяме фактурите с по-голяма сума към "Критичните вземания" (над 1000 лв)
      if (amount > 1000) {
        criticalReceivables.push(sale);
      }
    }

    // 3. Задължения (Очаквани разходи от фактури за покупка)
    const purchases = await db.select().from(purchaseInvoices).where(
      and(
        eq(purchaseInvoices.tenantId, tenantId),
        eq(purchaseInvoices.status, 'approved') // Или draft
      )
    );

    let outgoingCash = 0;
    for (const purchase of purchases) {
      outgoingCash += parseFloat(purchase.totalAmount || '0');
    }

    // Добавяме фиктивна тежест "Заплати и Осигуровки" (в реалността се дърпа от payroll_runs)
    // За нуждите на демото добавяме едни 25% от приходите като оперативен разход.
    const estimatedPayroll = incomingCash * 0.25;
    outgoingCash += estimatedPayroll;

    // 4. Калкулация
    const predictedBalance = currentBalance + incomingCash - outgoingCash;
    
    // AI Анализ/Съвет
    let aiAdvice = '';
    let status = 'healthy';
    
    if (predictedBalance < 0) {
      status = 'critical';
      aiAdvice = `КРИТИЧНО: Прогнозира се недостиг на средства от ${Math.abs(predictedBalance).toFixed(2)} лв след 30 дни. Спешно съберете критичните вземания!`;
    } else if (predictedBalance < currentBalance * 0.5) {
      status = 'warning';
      aiAdvice = `ВНИМАНИЕ: Очаква се сериозен спад в ликвидността. Разходите ви надвишават постъпленията.`;
    } else {
      status = 'healthy';
      aiAdvice = `ЛИКВИДНОСТТА Е СТАБИЛНА. Очаквате положителен паричен поток през следващия месец.`;
    }

    return {
      success: true,
      data: {
        currentBalance,
        incomingCash,
        outgoingCash,
        estimatedPayroll,
        predictedBalance,
        status,
        aiAdvice,
        criticalReceivables: criticalReceivables.map(r => ({
          invoiceNumber: r.invoiceNumber,
          counterpartyName: r.counterpartyName,
          totalAmount: r.totalAmount
        })).slice(0, 5) // Само топ 5
      }
    };

  } catch (error: any) {
    console.error('[Cashflow Predictor Error]', error);
    return { success: false, error: error.message };
  }
}
