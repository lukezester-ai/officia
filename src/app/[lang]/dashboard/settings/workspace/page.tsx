'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getBillingSummary } from '@/lib/billing/actions';
import { BillingPlanCard } from './BillingPlanCard';
import { getTenantProfile, updateTenantProfile } from './actions';

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const lang = String(params?.lang ?? 'bg');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bulstat: '',
    vatNumber: '',
    address: '',
  });

  const [billing, setBilling] = useState<{
    plan: string;
    storedPlan: string;
    canManageSubscription: boolean;
    trialEndsAt: string | null;
    usedInvoices: number;
    invoiceLimit: number | null;
    bankSync: boolean;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const [profileRes, billingRes] = await Promise.all([getTenantProfile(), getBillingSummary()]);

      if (profileRes.success && profileRes.data) {
        setFormData({
          name: profileRes.data.name || '',
          bulstat: profileRes.data.bulstat || '',
          vatNumber: profileRes.data.vatNumber || '',
          address: profileRes.data.address || '',
        });
      }

      if (billingRes.success && billingRes.data) {
        setBilling(billingRes.data);
      }

      setLoading(false);
    }

    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const result = await updateTenantProfile(formData);
    if (result.success) {
      toast.success('Данните на фирмата са запазени успешно.');
    } else {
      toast.error(`Грешка: ${result.error}`);
    }

    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Зареждане на данните...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Настройки на фирмата</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Тези данни се използват за издаване на фактури и генериране на данъчни декларации.
        </p>
      </div>

      {billing && <BillingPlanCard lang={lang} initial={billing} />}

      <Card className="shadow-sm border-0 ring-1 ring-black/5">
        <CardHeader className="bg-gray-50/50 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 size={18} className="text-indigo-600" />
            Фирмен профил
          </CardTitle>
          <CardDescription>
            Въведете официалните данни на търговското дружество.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="name">Име на фирмата</label>
              <Input
                id="name"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="напр. Офисия ООД"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="bulstat">ЕИК / Булстат</label>
                <Input
                  id="bulstat"
                  value={formData.bulstat}
                  onChange={(event) => setFormData({ ...formData, bulstat: event.target.value })}
                  placeholder="9 или 13 цифри"
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="vatNumber">ИН по ЗДДС (по избор)</label>
                <Input
                  id="vatNumber"
                  value={formData.vatNumber}
                  onChange={(event) => setFormData({ ...formData, vatNumber: event.target.value })}
                  placeholder="напр. BG123456789"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="address">Седалище и адрес на управление</label>
              <Input
                id="address"
                value={formData.address}
                onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                placeholder="гр. София, ул. Примерна 1"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Save size={16} />
                {saving ? 'Запазване...' : 'Запази промените'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
