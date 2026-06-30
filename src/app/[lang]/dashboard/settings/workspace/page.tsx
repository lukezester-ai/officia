'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTenantProfile, updateTenantProfile } from './actions';
import { getBillingSummary } from '@/lib/billing/actions';
import { BillingPlanCard } from './BillingPlanCard';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

import { Building2, Save } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateTenantProfile(formData);
    if (res.success) {
      toast.success('Данните на фирмата са запазени успешно!');
    } else {
      toast.error('Грешка: ' + res.error);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Зареждане на данни...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Настройки на Фирмата</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Тези данни се използват за издаване на фактури и генериране на данъчни декларации.
        </p>
      </div>

      {billing && <BillingPlanCard lang={lang} initial={billing} />}

      <Card className="shadow-sm border-0 ring-1 ring-black/5">
        <CardHeader className="bg-gray-50/50 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 size={18} className="text-indigo-600" />
            Фирмен Профил
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
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="напр. Офисиа ООД"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="bulstat">ЕИК / Булстат</label>
                <Input 
                  id="bulstat" 
                  value={formData.bulstat}
                  onChange={(e) => setFormData({...formData, bulstat: e.target.value})}
                  placeholder="9 цифри"
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="vatNumber">ИН по ЗДДС (по избор)</label>
                <Input 
                  id="vatNumber" 
                  value={formData.vatNumber}
                  onChange={(e) => setFormData({...formData, vatNumber: e.target.value})}
                  placeholder="напр. BG123456789"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="address">Седалище и адрес на управление</label>
              <Input 
                id="address" 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
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
