"use server";

import { CurrencyService } from "@/lib/accounting/currency-service";
import { revalidatePath } from "next/cache";

export async function syncRates() {
  const received = await CurrencyService.syncLatestRates();
  revalidatePath("/[lang]/dashboard/accounting/currencies", "page");
  if (received === 0) {
    return { success: false, error: 'Курсовете не се свалиха. ЕЦБ не отговори.' };
  }
  return { success: true };
}

export async function getCurrencyHistory(currency: string) {
  return await CurrencyService.getHistory(currency);
}
