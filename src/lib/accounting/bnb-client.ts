/**
 * Курсове спрямо еврото от дневния файл на ЕЦБ през Frankfurter.
 * При липса на отговор не се измисля число.
 */

export interface BnbExchangeRate {
  currencyCode: string;
  rate: number;
  date: string;
}

export function ecbRateFromFrankfurter(body: unknown, currencyCode: string, requestedDate: string): BnbExchangeRate {
  const code = currencyCode.toUpperCase();
  if (code === 'EUR') {
    return { currencyCode: 'EUR', rate: 1, date: requestedDate };
  }
  const record = body && typeof body === 'object' ? body as { date?: unknown; rates?: { EUR?: unknown } } : {};
  const rate = Number(record.rates?.EUR);
  const date = typeof record.date === 'string' && record.date ? record.date : requestedDate;
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Няма курс на ЕЦБ за ${code} на ${requestedDate}.`);
  }
  return { currencyCode: code, rate, date };
}

export class BnbClient {
  async getExchangeRate(currencyCode: string, date: string): Promise<BnbExchangeRate> {
    const code = currencyCode.toUpperCase();
    if (code === 'EUR') {
      return { currencyCode: 'EUR', rate: 1, date };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Датата на курса трябва да е във формат ГГГГ-ММ-ДД.');
    }

    const response = await fetch(`https://api.frankfurter.app/${date}?from=${encodeURIComponent(code)}&to=EUR`);
    if (!response.ok) {
      throw new Error(`ЕЦБ не върна курс за ${code} на ${date}.`);
    }
    return ecbRateFromFrankfurter(await response.json(), code, date);
  }
}

export const bnbClient = new BnbClient();
