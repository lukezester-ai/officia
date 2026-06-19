// @ts-nocheck
import { db } from '@/lib/db/db';
import { exchangeRates } from '@/lib/db/schema/exchange_rates';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export interface CurrencyTrend {
  currencyFrom: string;
  currencyTo: string;
  currentRate: number;
  previousRate: number;
  changePercent: number;
}

export class CurrencyService {
  private static readonly TARGET_CURRENCIES = ['USD', 'GBP', 'CHF', 'JPY'];
  private static readonly BASE_CURRENCY = 'EUR';
  
  /**
   * Fetches latest exchange rates from an open API (Frankfurter - ECB rates)
   * and saves them to the database.
   */
  static async syncLatestRates() {
    for (const cur of this.TARGET_CURRENCIES) {
      if (cur === this.BASE_CURRENCY) continue;
      
      try {
        const response = await fetch(`https://api.frankfurter.app/latest?from=${cur}&to=${this.BASE_CURRENCY}`);
        if (!response.ok) continue;
        
        const data = await response.json();
        const rate = data.rates[this.BASE_CURRENCY];
        const dateStr = data.date; // "YYYY-MM-DD"

        // Check if rate already exists for this date
        const existing = await db.query.exchangeRates.findFirst({
          where: and(
            eq(exchangeRates.currencyFrom, cur),
            eq(exchangeRates.currencyTo, this.BASE_CURRENCY),
            eq(exchangeRates.rateDate, dateStr)
          )
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

  /**
   * Returns current and previous day rates to calculate trends
   */
  static async getTrends(): Promise<CurrencyTrend[]> {
    const trends: CurrencyTrend[] = [];

    for (const cur of this.TARGET_CURRENCIES) {
      const records = await db.query.exchangeRates.findMany({
        where: and(
          eq(exchangeRates.currencyFrom, cur),
          eq(exchangeRates.currencyTo, this.BASE_CURRENCY)
        ),
        orderBy: [desc(exchangeRates.rateDate)],
        limit: 2
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
          changePercent
        });
      }
    }

    return trends;
  }

  /**
   * Fetches history for chart (last 30 days) from external API on the fly or from DB.
   * We will fetch on the fly for the chart to ensure we have a full curve.
   */
  static async getHistory(currencyFrom: string): Promise<{date: string, rate: number}[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    try {
      const res = await fetch(`https://api.frankfurter.app/${startStr}..${endStr}?from=${currencyFrom}&to=${this.BASE_CURRENCY}`);
      if (!res.ok) return [];
      const data = await res.json();
      
      const history = [];
      for (const [date, rates] of Object.entries(data.rates)) {
        history.push({
          date,
          rate: (rates as any)[this.BASE_CURRENCY]
        });
      }
      return history;
    } catch (e) {
      return [];
    }
  }
}
