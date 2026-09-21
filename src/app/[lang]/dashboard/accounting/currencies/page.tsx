import { CurrencyService } from "@/lib/accounting/currency-service";
import CurrenciesClient from "./CurrenciesClient";
import { auth } from "@clerk/nextjs/server";

export default async function CurrenciesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  
  // Try to sync on load if we don't have today's rates
  await CurrencyService.syncLatestRates();

  const trends = await CurrencyService.getTrends();

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Валути и Курсови Разлики</h1>
          <p className="text-zinc-400 text-sm">Официални курсове на ЕЦБ спрямо EUR</p>
        </div>
        
        <CurrenciesClient initialTrends={trends} />
      </div>
    </div>
  );
}
