'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, Save, ImagePlus, X, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getBillingSummary } from '@/lib/billing/actions';
import { BillingPlanCard } from './BillingPlanCard';
import { getTenantProfile, updateTenantProfile, removeLogo, updateNordigenKeys } from './actions';

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const lang = String(params?.lang ?? 'bg');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    bulstat: '',
    vatNumber: '',
    address: '',
  });

  const [nordigen, setNordigen] = useState({ nordigenSecretId: '', nordigenSecretKey: '' });
  const [savingNordigen, setSavingNordigen] = useState(false);

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
        setLogoUrl((profileRes.data as any).logoUrl || null);
        setNordigen({
          nordigenSecretId: (profileRes.data as any).nordigenSecretId || '',
          nordigenSecretKey: (profileRes.data as any).nordigenSecretKey || '',
        });
      }

      if (billingRes.success && billingRes.data) {
        setBilling(billingRes.data);
      }

      setLoading(false);
    }

    load();
  }, []);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Логото трябва да е под 2MB');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setLogoUrl(data.url);
      toast.success('Логото е качено успешно.');
    } catch {
      toast.error('Грешка при качване на логото');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    const result = await removeLogo();
    if (result.success) {
      setLogoUrl(null);
      toast.success('Логото е премахнато.');
    } else {
      toast.error(`Грешка: ${result.error}`);
    }
  };

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

  const handleNordigenSave = async () => {
    setSavingNordigen(true);
    const result = await updateNordigenKeys(nordigen);
    if (result.success) {
      toast.success('Open Banking ключовете са запазени.');
    } else {
      toast.error(`Грешка: ${result.error}`);
    }
    setSavingNordigen(false);
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

            <div className="border-t pt-4">
              <label className="text-sm font-medium block mb-2">Фирмено лого за фактури (по избор)</label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative w-20 h-20 rounded-lg border overflow-hidden bg-white">
                    <img src={logoUrl} alt="Лого" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors bg-zinc-50"
                  >
                    <ImagePlus size={24} className="text-zinc-400" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {!logoUrl && (
                  <p className="text-xs text-zinc-400">PNG, JPG до 2MB</p>
                )}
                {uploading && <span className="text-sm text-zinc-500">Качване...</span>}
              </div>
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

      <Card className="shadow-sm border-0 ring-1 ring-black/5">
        <CardHeader className="bg-gray-50/50 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Landmark size={18} className="text-indigo-600" />
            Open Banking (PSD2)
          </CardTitle>
          <CardDescription>
            Свържете банковите си сметки чрез GoCardless. Регистрирайте се безплатно на{' '}
            <a href="https://gocardless.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">gocardless.com</a>,
            добавете своите <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">secret_id</code> и{' '}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">secret_key</code> тук.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="nordigenId">Secret ID</label>
              <Input
                id="nordigenId"
                value={nordigen.nordigenSecretId}
                onChange={(e) => setNordigen({ ...nordigen, nordigenSecretId: e.target.value })}
                placeholder="от GoCardless Dashboard → API"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="nordigenKey">Secret Key</label>
              <Input
                id="nordigenKey"
                type="password"
                value={nordigen.nordigenSecretKey}
                onChange={(e) => setNordigen({ ...nordigen, nordigenSecretKey: e.target.value })}
                placeholder="от GoCardless Dashboard → API"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleNordigenSave} disabled={savingNordigen} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Save size={16} />
                {savingNordigen ? 'Запазване...' : 'Запази ключовете'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
