'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, CreditCard, Sparkles } from 'lucide-react';

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

const PLAN_LABELS: Record<string, string> = {
  starter: 'Стартов',
  business: 'Бизнес',
  pro: 'Професионален',
};

const PLAN_PRICES: Record<string, { monthly: number; annual: number; annualTotal: number }> = {
  business: { monthly: 14.90, annual: 11.90, annualTotal: 142.80 },
  pro: { monthly: 39.20, annual: 31.36, annualTotal: 376.32 },
};

export function BillingPlanCard({ lang, initial }: { lang: string; initial: BillingData }) {
  const [pending, setPending] = useState<'portal' | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [targetPlan, setTargetPlan] = useState<'business' | 'pro'>('business');
  const trialActive = initial.trialEndsAt && new Date(initial.trialEndsAt) > new Date();

  const upgrade = () => {
    window.location.href = `/api/billing/go?plan=${targetPlan}&cycle=${billingCycle}`;
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

  const currentLabel = PLAN_LABELS[initial.plan] || initial.plan;

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
          <span className="font-semibold">{currentLabel}</span>
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
                <span className="text-muted-foreground">от {PLAN_PRICES[targetPlan].annual.toLocaleString('bg-BG', { minimumFractionDigits: 2 })} € / мес</span>
                <span className="block text-xs font-medium text-emerald-700">Спестявате 20%</span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`rounded-lg border p-3 text-left text-sm ${billingCycle === 'monthly' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'hover:bg-gray-50'}`}
              >
                <span className="block font-semibold">Месечно</span>
                <span className="text-muted-foreground">{PLAN_PRICES[targetPlan].monthly.toLocaleString('bg-BG', { minimumFractionDigits: 2 })} € / месец</span>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetPlan('business')}
                className={`flex-1 rounded-lg border p-2 text-center text-sm ${targetPlan === 'business' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'hover:bg-gray-50'}`}
              >
                <span className="block font-semibold text-amber-700">Бизнес</span>
                <span className="text-xs text-muted-foreground">до 500 фактури</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetPlan('pro')}
                className={`flex-1 rounded-lg border p-2 text-center text-sm ${targetPlan === 'pro' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'hover:bg-gray-50'}`}
              >
                <span className="block font-semibold text-indigo-700">Професионален</span>
                <span className="text-xs text-muted-foreground">неограничени</span>
              </button>
            </div>
            <Button onClick={upgrade} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Sparkles size={16} />
              Избери {targetPlan === 'business' ? 'Бизнес' : 'Професионален'} план
            </Button>
          </div>
        )}
        {initial.canManageSubscription && (
          <Button variant="outline" onClick={manageSubscription} disabled={pending !== null} className="w-full gap-2">
            <ArrowUpRight size={16} />
            {pending === 'portal' ? 'Отваряне...' : 'Управление или отказ на абонамента'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
