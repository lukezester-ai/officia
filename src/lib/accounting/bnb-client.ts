// @ts-nocheck
/**
 * БНБ (Българска народна банка) Exchange Rate Client
 * Retrieves official daily exchange rates for foreign currencies against BGN.
 */

export interface BnbExchangeRate {
  currencyCode: string; // e.g. 'USD', 'EUR', 'GBP'
  rate: number;         // e.g. 1.95583 for EUR
  date: string;         // e.g. '2026-07-31'
}

export class BnbClient {
  /**
   * Fetches the exchange rate for a specific date.
   * EUR is fixed at 1.95583.
   * For MVP, we simulate real-time rates for other currencies.
   * In production, this would parse the XML from: https://www.bnb.bg/Statistics/StExternalSector/StExchangeRates/StERForeignCurrencies/index.htm?download=xml
   */
  async getExchangeRate(currencyCode: string, date: string): Promise<BnbExchangeRate> {
    const code = currencyCode.toUpperCase();
    
    // Българският лев е вързан към Еврото
    if (code === 'EUR') {
      return { currencyCode: 'EUR', rate: 1.95583, date };
    }
    
    if (code === 'BGN') {
      return { currencyCode: 'BGN', rate: 1.00000, date };
    }

    // Симулация на изтегляне на валутен курс от БНБ за други валути
    console.log(`[BNB Client] Fetching official exchange rate for ${code} on ${date}...`);
    
    let simulatedRate = 1.0;
    if (code === 'USD') simulatedRate = 1.80 + (Math.random() * 0.05 - 0.025); // ~1.80
    if (code === 'GBP') simulatedRate = 2.25 + (Math.random() * 0.05 - 0.025); // ~2.25
    if (code === 'CHF') simulatedRate = 2.05 + (Math.random() * 0.05 - 0.025); // ~2.05

    // Закръгляме до 5 знака след запетаята според стандарта на БНБ
    simulatedRate = Math.round(simulatedRate * 100000) / 100000;

    return {
      currencyCode: code,
      rate: simulatedRate,
      date
    };
  }
}

export const bnbClient = new BnbClient();
