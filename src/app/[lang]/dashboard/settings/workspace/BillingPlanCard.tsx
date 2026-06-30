'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Sparkles } from 'lucide-react';

type BillingData = {
  plan: string;
  trialEndsAt: string | null;
  usedInvoices: number;
  invoiceLimit: number | null;
  bankSync: boolean;
};

export function BillingPlanCard({ lang, initial }: { lang: string; initial: BillingData }) {
  const [loading, setLoading] = useState(false);
  const trialActive = initial.trialEndsAt && new Date(initial.trialEndsAt) > new Date();

  const upgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, billingCycle: 'monthly' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Грешка');
      if (data.url) window.location.href = data.url;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Грешка при checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm border-0 ring-1 ring-black/5">
      <CardHeader className="bg-gray-50/50 border-b pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard size={18} className="text-indigo-600" />
          План и фактуриране
        </CardTitle>
        <CardDescription>Текущ план, trial и лимити.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">План</span>
          <span className="font-semibold uppercase">{initial.plan}</span>
        </div>
        {trialActive && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Trial до</span>
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
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Банкова синхронизация</span>
          <span>{initial.bankSync ? 'Pro' : 'Само demo'}</span>
        </div>
        {initial.plan !== 'pro' && (
          <Button onClick={upgrade} disabled={loading} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Sparkles size={16} />
            {loading ? 'Пренасочване...' : 'Надгради до Pro'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
