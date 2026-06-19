import { auth } from '@clerk/nextjs/server';
import { ReconciliationEngine } from '@/lib/accounting/reconciliation-engine';
import ReconciliationClient from './ReconciliationClient';

export default async function ReconciliationPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const { userId, orgId } = await auth();
  const tenantId = orgId || userId || "demo-tenant";

  const suggestions = await ReconciliationEngine.suggestMatches(tenantId);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Банково Равнение</h1>
          <p className="text-zinc-400 text-sm">Автоматично разпознаване чрез AI Matching</p>
        </div>
        
        <ReconciliationClient initialSuggestions={suggestions} />
      </div>
    </div>
  );
}
