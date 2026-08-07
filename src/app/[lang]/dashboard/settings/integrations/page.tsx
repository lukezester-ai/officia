'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function IntegrationsSettingsPage({ params }: { params: { lang: string } }) {
  const [eik, setEik] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // Този статус в реалното приложение би идвал от сървъра първоначално

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eik || !apiKey) return;
    
    setIsLoading(true);
    
    try {
      // In a real app we'd get the organizationId from the auth context (Clerk/getCurrentTenant)
      // For this UI, we mock the organizationId
      const orgId = "00000000-0000-0000-0000-000000000000"; 
      
      const response = await fetch('/api/nap/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          eik,
          apiKey
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIsConnected(true);
        setApiKey('');
        toast.success('Успешна връзка с НАП!');
      } else {
        toast.error(data.error || 'Възникна грешка при свързването');
      }
    } catch (error) {
      toast.error('Проблем със сървъра. Опитайте отново.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Интеграции</h1>
        <p className="text-muted-foreground mt-2">Управлявайте външните връзки на вашия бизнес акаунт.</p>
      </div>
      
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                НАП B2G API
                {isConnected && <Badge className="bg-emerald-500"><CheckCircle2 className="w-3 h-3 mr-1"/> Свързан</Badge>}
              </CardTitle>
              <CardDescription className="mt-2">
                Свържете профила си с Националната агенция за приходите (НАП) за автоматично подаване на справки-декларации и е-фактуриране (e-Invoicing).
              </CardDescription>
            </div>
            {!isConnected && (
              <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Не е свързан</Badge>
            )}
          </div>
        </CardHeader>
        
        {isConnected ? (
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Връзката е активна и криптирана</p>
                <p className="text-sm text-muted-foreground mt-1">Вашият API ключ се съхранява надеждно чрез AES-256-GCM криптиране. Системата има достъп до подаване на ДДС дневници и изпращане на електронни фактури.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div>
                <p className="text-muted-foreground">Регистриран ЕИК</p>
                <p className="font-medium">{eik || '123456789'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Статус на услугата</p>
                <p className="font-medium text-emerald-600">Онлайн (Продукционна среда)</p>
              </div>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleConnect}>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="eik">ЕИК (Булстат)</Label>
                <Input 
                  id="eik" 
                  placeholder="Въведете вашия 9 или 13 цифрен ЕИК" 
                  value={eik}
                  onChange={(e) => setEik(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiKey">Ключ за достъп (API Key / Certificate Token)</Label>
                <Input 
                  id="apiKey" 
                  type="password" 
                  placeholder="Този ключ ще бъде криптиран преди да се запази в базата" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? 'Свързване...' : 'Свържи с НАП'}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
      
      {/* Място за други интеграции като e-Fact, Stripe, Banks */}
    </div>
  );
}
