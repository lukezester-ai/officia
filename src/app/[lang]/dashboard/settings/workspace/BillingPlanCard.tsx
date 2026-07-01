'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, ExternalLink, Sparkles } from 'lucide-react';

type BillingCycle = 'monthly' | 'annual';

type BillingData = {
  plan: string;
  storedPlan: string;
  canManageSubscription: boolean;
  trialEndsAt: string | null;
  usedInvoices: number;
  invoiceLimit: number | null;
  bankSync: boolean;
};

export function BillingPlanCard({ lang, initial }: { lang: string; initial: BillingData }) {
  const [pending, setPending] = useState<'checkout' | 'portal' | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const trialActive = initial.trialEndsAt && new Date(initial.trialEndsAt) > new Date();

  const upgrade = async () => {
    setPending('checkout');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Грешка при плащането');
      if (data.url) window.location.href = data.url;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Грешка при преминаване към плащане');
    } finally {
      setPending(null);
    }
  };

  const manageSubscription = async () => {
    setPending('portal');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Грешка при отваряне на абонамента');
      if (data.url) window.location.href = data.url;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Грешка при отваряне на абонамента');
    } finally {
      setPending(null);
    }
  };

  return (
    <Card className="shadow-sm border-0 ring-1 ring-black/5">
      <CardHeader className="bg-gray-50/50 border-b pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard size={18} className="text-indigo-600" />
          План и фактуриране
        </CardTitle>
        <CardDescription>Текущ план, пробен период и лимити.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">План</span>
          <span className="font-semibold">{initial.plan === 'pro' ? 'Професионален' : 'Стартов'}</span>
        </div>
        {trialActive && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Пробен период до</span>
            <span>{new Date(initial.trialEndsAt!).toLocaleDateString('bg-BG')}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Фактури този месец</span>
          <span>
            {initial.usedInvoices}
            {initial.invoiceLimit != null ? ` / ${initial.invoiceLimit}` : ' (неограничено)'}
          </span>
        </div>
        {!initial.canManageSubscription && (
          <div className="space-y-3 border-t pt-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`rounded-lg border p-3 text-left text-sm ${billingCycle === 'annual' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'hover:bg-gray-50'}`}
              >
                <span className="block font-semibold">Годишно</span>
                <span className="text-muted-foreground">376,32 € / година</span>
                <span className="block text-xs font-medium text-emerald-700">Спестявате 20%</span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`rounded-lg border p-3 text-left text-sm ${billingCycle === 'monthly' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'hover:bg-gray-50'}`}
              >
                <span className="block font-semibold">Месечно</span>
                <span className="text-muted-foreground">39,20 € / месец</span>
              </button>
            </div>
            <Button onClick={upgrade} disabled={pending !== null} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Sparkles size={16} />
              {pending === 'checkout' ? 'Пренасочване...' : billingCycle === 'annual' ? 'Избери годишен план' : 'Избери месечен план'}
            </Button>
          </div>
        )}
        {initial.canManageSubscription && (
          <Button variant="outline" onClick={manageSubscription} disabled={pending !== null} className="w-full gap-2">
            <ExternalLink size={16} />
            {pending === 'portal' ? 'Отваряне...' : 'Управление или отказ на абонамента'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
