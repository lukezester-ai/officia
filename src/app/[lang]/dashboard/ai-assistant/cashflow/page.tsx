import CashflowClient from './CashflowClient';
import { requireTenant } from '@/lib/auth/get-tenant';
import { redirect } from 'next/navigation';

export default async function PredictiveCashflowPage() {
  const { tenantId } = await requireTenant();
  if (!tenantId) redirect('/sign-in');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Predictive Cashflow</h1>
        <p className="text-zinc-400">AI модел за предсказване на паричните потоци през следващите 30 дни.</p>
      </div>
      
      <CashflowClient />
    </div>
  );
}
