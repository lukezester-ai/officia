'use client';
import { useState, useEffect, useMemo } from 'react';
import { getCounterparties, createCounterparty, updateCounterparty, deactivateCounterparty } from './actions';
import { Card, CardContent } from '@/components/ui/card';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const res = await getCounterparties();
    if (res.success) setAll((res as any).data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => all.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.eik?.toLowerCase().includes(search.toLowerCase()) ||
    c.vatNumber?.toLowerCase().includes(search.toLowerCase())
  ), [all, search]);

  const customers = filtered.filter(c => c.type === 'customer' || c.type === 'both');
  const suppliers = filtered.filter(c => c.type === 'supplier' || c.type === 'both');
  const active = all.filter(c => c.isActive !== false);

  const handleSave = async (data: any) => {
    let res;
    if (editing) res = await updateCounterparty(editing.id, data);
    else res = await createCounterparty(data);
    if (res.success) { toast.success(editing ? 'Обновено!' : 'Добавено!'); setDialogOpen(false); setEditing(null); load(); }
    else toast.error('Грешка');
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Деактивиране?')) return;
    const res = await deactivateCounterparty(id);
    if (res.success) { toast.success('Деактивирано'); load(); } else toast.error('Грешка');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Контрагенти</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Клиенти и доставчици</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus size={14} />Нов контрагент
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-700 text-white rounded-2xl p-5 shadow-lg shadow-indigo-200/60 dark:shadow-indigo-900/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2.5"><Users size={18} /></div>
            <div><p className="text-sm text-indigo-100">Общо контрагенти</p><p className="text-2xl font-bold">{active.length}</p></div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-5 shadow-lg shadow-emerald-200/60 dark:shadow-emerald-900/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2.5"><Users size={18} /></div>
            <div><p className="text-sm text-emerald-100">Клиенти</p><p className="text-2xl font-bold">{customers.length}</p></div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 shadow-lg shadow-amber-200/60 dark:shadow-amber-900/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2.5"><Building2 size={18} /></div>
            <div><p className="text-sm text-amber-100">Доставчици</p><p className="text-2xl font-bold">{suppliers.length}</p></div>
          </div>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-5">
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Търси по наименование, ЕИК, ДДС..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Всички ({filtered.length})</TabsTrigger>
              <TabsTrigger value="customers">Клиенти ({customers.length})</TabsTrigger>
              <TabsTrigger value="suppliers">Доставчици ({suppliers.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <CounterpartyTable data={filtered} loading={loading} onEdit={c => { setEditing(c); setDialogOpen(true); }} onDeactivate={handleDeactivate} />
            </TabsContent>
            <TabsContent value="customers">
              <CounterpartyTable data={customers} loading={loading} onEdit={c => { setEditing(c); setDialogOpen(true); }} onDeactivate={handleDeactivate} />
            </TabsContent>
            <TabsContent value="suppliers">
              <CounterpartyTable data={suppliers} loading={loading} onEdit={c => { setEditing(c); setDialogOpen(true); }} onDeactivate={handleDeactivate} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CounterpartyDialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) setEditing(null); }} initial={editing} onSave={handleSave} />
    </div>
  );
}