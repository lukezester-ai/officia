'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Save, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    eik: '',
    apiKey: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/nap/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Грешка при запазване на интеграцията');
      }

      toast.success('НАП интеграцията е запазена успешно!');
      setFormData({ eik: '', apiKey: '' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Интеграции</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Свържете Officia ERP с външни системи и услуги.
        </p>
      </div>

      <Card className="shadow-sm border-0 ring-1 ring-black/5">
        <CardHeader className="bg-gray-50/50 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <LinkIcon size={18} className="text-indigo-600" />
            НАП (Национална агенция за приходите)
          </CardTitle>
          <CardDescription>
            Въведете вашия ЕИК и API ключ, за да позволите автоматизирано изтегляне на данни и подаване на декларации.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="eik">ЕИК / Булстат</label>
              <Input
                id="eik"
                value={formData.eik}
                onChange={(event) => setFormData({ ...formData, eik: event.target.value })}
                placeholder="напр. 123456789"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="apiKey">API Ключ</label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(event) => setFormData({ ...formData, apiKey: event.target.value })}
                placeholder="Въведете секретния ключ от портала на НАП"
                required
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Save size={16} />
                {loading ? 'Свързване...' : 'Запази НАП ключа'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
