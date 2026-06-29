import { db } from '@/lib/db/db';
import { exchangeRates } from '@/lib/db/schema/exchange_rates';
import { eq, and, desc } from 'drizzle-orm';

export interface CurrencyTrend {
  currencyFrom: string;
  currencyTo: string;
  currentRate: number;
  previousRate: number;
  changePercent: number;
}

type FrankfurterLatestResponse = {
  date: string;
  rates: Record<string, number>;
};

type FrankfurterHistoryResponse = {
  rates: Record<string, Record<string, number>>;
};

export class CurrencyService {
  private static readonly TARGET_CURRENCIES = ['USD', 'GBP', 'CHF', 'JPY'];
  private static readonly BASE_CURRENCY = 'EUR';

  static async syncLatestRates() {
    for (const cur of this.TARGET_CURRENCIES) {
      if (cur === this.BASE_CURRENCY) continue;

      try {
        const response = await fetch(
          `https://api.frankfurter.app/latest?from=${cur}&to=${this.BASE_CURRENCY}`,
        );
        if (!response.ok) continue;

        const data = (await response.json()) as FrankfurterLatestResponse;
        const rate = data.rates[this.BASE_CURRENCY];
        const dateStr = data.date;

        if (rate === undefined) continue;

        const existing = await db.query.exchangeRates.findFirst({
          where: and(
            eq(exchangeRates.currencyFrom, cur),
            eq(exchangeRates.currencyTo, this.BASE_CURRENCY),
            eq(exchangeRates.rateDate, dateStr),
          ),
        });

        if (!existing) {
          await db.insert(exchangeRates).values({
            currencyFrom: cur,
            currencyTo: this.BASE_CURRENCY,
            rateDate: dateStr,
            rate: String(rate),
          });
        }
      } catch (error) {
        console.error(`Failed to sync rate for ${cur}:`, error);
      }
    }
  }

  static async getTrends(): Promise<CurrencyTrend[]> {
    const trends: CurrencyTrend[] = [];

    for (const cur of this.TARGET_CURRENCIES) {
      const records = await db.query.exchangeRates.findMany({
        where: and(
          eq(exchangeRates.currencyFrom, cur),
          eq(exchangeRates.currencyTo, this.BASE_CURRENCY),
        ),
        orderBy: [desc(exchangeRates.rateDate)],
        limit: 2,
      });

      if (records.length > 0) {
        const currentRate = parseFloat(records[0].rate || '0');
        const previousRate = records.length > 1 ? parseFloat(records[1].rate || '0') : currentRate;
        const changePercent = previousRate === 0 ? 0 : ((currentRate - previousRate) / previousRate) * 100;

        trends.push({
          currencyFrom: cur,
          currencyTo: this.BASE_CURRENCY,
          currentRate,
          previousRate,
          changePercent,
        });
      }
    }

    return trends;
  }

  static async getHistory(currencyFrom: string): Promise<{ date: string; rate: number }[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    try {
      const res = await fetch(
        `https://api.frankfurter.app/${startStr}..${endStr}?from=${currencyFrom}&to=${this.BASE_CURRENCY}`,
      );
      if (!res.ok) return [];

      const data = (await res.json()) as FrankfurterHistoryResponse;
      const history: { date: string; rate: number }[] = [];

      for (const [date, rates] of Object.entries(data.rates)) {
        const rate = rates[this.BASE_CURRENCY];
        if (rate !== undefined) {
          history.push({ date, rate });
        }
      }

      return history;
    } catch {
      return [];
    }
  }
}
