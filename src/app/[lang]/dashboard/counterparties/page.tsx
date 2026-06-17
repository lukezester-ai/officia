'use client';
import { useState, useEffect, useMemo } from 'react';
import { getCounterparties, createCounterparty, updateCounterparty, deactivateCounterparty } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Users, Building2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { CounterpartyDialog } from './_dialog';
import { CounterpartyTable } from './_table';

export default function CounterpartiesPage() {
  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getCounterparties().then(res => {
      if (res.success) setAll(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return all.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.eik || '').toLowerCase().includes(q) ||
      (c.vatNumber || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    );
  }, [all, search]);

  const active = all.filter(c => c.isActive);
  const clients = filtered.filter(c => c.type === 'client' || c.type === 'both');
  const suppliers = filtered.filter(c => c.type === 'supplier' || c.type === 'both');

  const handleAdd = async (data: any) => {
    const res = await createCounterparty(data);
    if (res.success && res.data) { setAll(prev => [res.data, ...prev]); toast.success(`${data.name} е добавен!`); }
    else toast.error('Грешка: ' + res.error);
  };

  const handleEdit = async (id: string, data: any) => {
    const res = await updateCounterparty(id, data);
    if (res.success) { setAll(prev => prev.map(c => c.id === id ? { ...c, ...data } : c)); toast.success('Записано!'); }
    else toast.error('Грешка: ' + res.error);
  };

  const handleDeactivate = async (id: string) => {
    const res = await deactivateCounterparty(id);
    if (res.success) { setAll(prev => prev.map(c => c.id === id ? { ...c, isActive: false } : c)); toast.success('Деактивиран.'); }
    else toast.error('Грешка: ' + res.error);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Контрагенти</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Регистър на клиенти и доставчици.</p>
        </div>
        <CounterpartyDialog
          onSave={handleAdd}
          trigger={<Button className="gap-2"><Plus size={15} /> Нов контрагент</Button>}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <Users size={14} /> Всички активни
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{active.length}</div></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <Users size={14} className="text-indigo-600" /> Клиенти
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {active.filter(c => c.type === 'client' || c.type === 'both').length}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <Building2 size={14} className="text-amber-600" /> Доставчици
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {active.filter(c => c.type === 'supplier' || c.type === 'both').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Регистър</CardTitle>
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Търси по име, ЕИК, град..."
                className="pl-8 h-8 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Зареждане...</p>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Всички ({filtered.length})</TabsTrigger>
                <TabsTrigger value="clients">Клиенти ({clients.length})</TabsTrigger>
                <TabsTrigger value="suppliers">Доставчици ({suppliers.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <CounterpartyTable items={filtered} onEdit={handleEdit} onDeactivate={handleDeactivate} />
              </TabsContent>
              <TabsContent value="clients">
                <CounterpartyTable items={clients} onEdit={handleEdit} onDeactivate={handleDeactivate} />
              </TabsContent>
              <TabsContent value="suppliers">
                <CounterpartyTable items={suppliers} onEdit={handleEdit} onDeactivate={handleDeactivate} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}