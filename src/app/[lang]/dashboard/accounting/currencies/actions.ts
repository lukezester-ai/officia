"use server";

import { CurrencyService } from "@/lib/accounting/currency-service";
import { revalidatePath } from "next/cache";

export async function syncRates() {
  await CurrencyService.syncLatestRates();
  revalidatePath("/[lang]/dashboard/accounting/currencies", "page");
  return { success: true };
}

export async function getCurrencyHistory(currency: string) {
  return await CurrencyService.getHistory(currency);
}
