import { db } from '@/lib/db/db';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { exchangeRates } from '@/lib/db/schema/exchange_rates';
import { and, desc, eq, lt, ne } from 'drizzle-orm';
import { bnbClient } from './bnb-client';

export function monthEndDate(year: string, month: string) {
  const y = Number(year);
  const m = Number(month);
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

/**
 * Сравнява салдото във валута по последния записан курс и по курса на ЕЦБ за края на месеца.
 * Не осчетоводява: няма отделно еврово салдо в главната книга, с което да се сравни.
 */
export async function runCurrencyRevaluation(tenantId: string, month: string, year: string): Promise<{ success: boolean; revaluationsCount?: number; totalImpact?: number; message?: string }> {
  try {
    const dateStr = monthEndDate(year, month);

    const foreignAccounts = await db.select().from(bankAccounts).where(
      and(
        eq(bankAccounts.tenantId, tenantId),
        ne(bankAccounts.currency, 'BGN'),
        ne(bankAccounts.currency, 'EUR')
      )
    );

    if (foreignAccounts.length === 0) {
      return { success: true, revaluationsCount: 0, totalImpact: 0, message: 'Няма валутни сметки за преоценка.' };
    }

    let compared = 0;
    let totalImpact = 0;
    const skipped: string[] = [];

    for (const account of foreignAccounts) {
      if (!account.currency || !account.balance) continue;
      const balanceForeign = parseFloat(account.balance);
      if (!Number.isFinite(balanceForeign) || balanceForeign === 0) continue;

      const ecb = await bnbClient.getExchangeRate(account.currency, dateStr);
      const [previous] = await db.select().from(exchangeRates).where(and(
        eq(exchangeRates.currencyFrom, account.currency),
        eq(exchangeRates.currencyTo, 'EUR'),
        lt(exchangeRates.rateDate, dateStr),
      )).orderBy(desc(exchangeRates.rateDate)).limit(1);

      if (!previous?.rate) {
        skipped.push(account.currency);
        continue;
      }

      const previousRate = parseFloat(previous.rate);
      if (!Number.isFinite(previousRate) || previousRate <= 0) {
        skipped.push(account.currency);
        continue;
      }

      compared += 1;
      totalImpact += balanceForeign * ecb.rate - balanceForeign * previousRate;
    }

    const skippedText = skipped.length > 0
      ? ` Без записан предишен курс: ${Array.from(new Set(skipped)).join(', ')}.`
      : '';

    return {
      success: true,
      revaluationsCount: compared,
      totalImpact,
      message: compared === 0
        ? `Няма с какво да се сравни курсът на ЕЦБ за ${dateStr}.${skippedText} Осчетоводяване не се прави.`
        : `Сравнени са ${compared} сметки. Разликата спрямо последния записан курс е ${totalImpact.toFixed(2)} €.${skippedText} Осчетоводяване не се прави.`,
    };
  } catch (error: any) {
    console.error('[runCurrencyRevaluation] Error:', error);
    return { success: false, message: error.message };
  }
}
