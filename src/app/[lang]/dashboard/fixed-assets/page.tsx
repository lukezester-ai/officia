'use client';
import { useState, useEffect } from 'react';
import { getFixedAssets, createFixedAsset, writeOffAsset } from './actions';
import { calcCurrentBookValue } from './utils';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Package, TrendingDown, AlertCircle, Layers } from 'lucide-react';
import { toast } from 'sonner';

const METHODS = [
  { value: 'straight_line', label: 'Линеен' },
  { value: 'declining_balance', label: 'Намаляващ остатък' },
];

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AddAssetDialog({ onAdd }: { onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', acquisitionDate: new Date().toISOString().split('T')[0], acquisitionCost: '', depreciationMethod: 'straight_line', usefulLifeYears: '5', residualValue: '0', notes: '' });

  const set = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Въведи наименование'); return; }
    if (!form.acquisitionCost || parseFloat(form.acquisitionCost) <= 0) { toast.error('Въведи стойност'); return; }
    setLoading(true);
    const res = await createFixedAsset({ name: form.name, category: form.category, acquisitionDate: form.acquisitionDate, acquisitionCost: parseFloat(form.acquisitionCost), depreciationMethod: form.depreciationMethod, usefulLifeYears: parseInt(form.usefulLifeYears), residualValue: parseFloat(form.residualValue) || 0, notes: form.notes });
    if (res.success) { toast.success('Активът е добавен!'); onAdd(); setOpen(false); setForm({ name: '', category: '', acquisitionDate: new Date().toISOString().split('T')[0], acquisitionCost: '', depreciationMethod: 'straight_line', usefulLifeYears: '5', residualValue: '0', notes: '' }); }
    else toast.error('Грешка');
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus size={14} />Нов актив</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Добави дълготраен актив</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><label className="text-sm font-medium">Наименование *</label><Input placeholder="Лаптоп / Автомобил..." value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Категория</label><Input placeholder="ДМА / НМА" value={form.category} onChange={e => set('category', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Дата придобиване</label><Input type="date" value={form.acquisitionDate} onChange={e => set('acquisitionDate', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Стойност *</label><Input type="number" min="0" step="0.01" placeholder="0.00" value={form.acquisitionCost} onChange={e => set('acquisitionCost', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Остатъчна стойност</label><Input type="number" min="0" step="0.01" placeholder="0.00" value={form.residualValue} onChange={e => set('residualValue', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Полезен живот (г.)</label><Input type="number" min="1" max="50" placeholder="5" value={form.usefulLifeYears} onChange={e => set('usefulLifeYears', e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Метод на амортизация</label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none" value={form.depreciationMethod} onChange={e => set('depreciationMethod', e.target.value)}>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Бележки</label><Input placeholder="По желание..." value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Отказ</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Записва...' : 'Добави'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await getFixedAssets();
    if (res.success) setAssets((res as any).data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleWriteOff = async (id: string, name: string) => {
    if (!confirm(`Отписване на "${name}"?`)) return;
    const res = await writeOffAsset(id);
    if (res.success) { toast.success('Активът е отписан'); load(); } else toast.error('Грешка');
  };

  const active = assets.filter(a => a.status === 'active');
  const writtenOff = assets.filter(a => a.status === 'written_off');
  const totalCost = active.reduce((s, a) => s + parseFloat(a.acquisitionCost || '0'), 0);
  const totalBookValue = active.reduce((s, a) => s + calcCurrentBookValue(a), 0);
  const monthlyDepr = active.reduce((s, a) => {
    const annual = (parseFloat(a.acquisitionCost || '0') - parseFloat(a.residualValue || '0')) / (a.usefulLifeYears || 1);
    return s + annual / 12;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Дълготрайни активи</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Управление и амортизация на активите</p>
        </div>
        <AddAssetDialog onAdd={load} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-700 text-white rounded-2xl p-5 shadow-lg shadow-indigo-200/60 dark:shadow-indigo-900/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2.5"><Layers size={18} /></div>
            <div><p className="text-sm text-indigo-100">Активни активи</p><p className="text-2xl font-bold">{active.length}</p></div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-5 shadow-lg shadow-emerald-200/60 dark:shadow-emerald-900/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2.5"><Package size={18} /></div>
            <div><p className="text-sm text-emerald-100">Балансова стойност</p><p className="text-xl font-bold">{fmt(totalBookValue)} лв.</p></div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 shadow-lg shadow-amber-200/60 dark:shadow-amber-900/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2.5"><TrendingDown size={18} /></div>
            <div><p className="text-sm text-amber-100">Месечна амортизация</p><p className="text-xl font-bold">{fmt(monthlyDepr)} лв.</p></div>
          </div>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-5">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground text-sm">Зарежда...</div>
          ) : assets.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">Няма добавени активи.</div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead>Наименование</TableHead><TableHead>Категория</TableHead><TableHead>Дата</TableHead>
                  <TableHead className="text-right">Стойност</TableHead><TableHead>Метод</TableHead>
                  <TableHead className="text-right">Балансова ст.</TableHead><TableHead>Статус</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {assets.map((a: any) => {
                    const bv = calcCurrentBookValue(a);
                    const isActive = a.status === 'active';
                    return (
                      <TableRow key={a.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-sm">{a.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.category || '—'}</TableCell>
                        <TableCell className="text-sm">{new Date(a.acquisitionDate).toLocaleDateString('bg-BG')}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(parseFloat(a.acquisitionCost))} лв.</TableCell>
                        <TableCell className="text-sm">{METHODS.find(m => m.value === a.depreciationMethod)?.label || a.depreciationMethod}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">{fmt(bv)} лв.</TableCell>
                        <TableCell>
                          <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-emerald-100' : ''}>
                            {isActive ? 'Активен' : 'Отписан'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isActive && (
                            <button onClick={() => handleWriteOff(a.id, a.name)} className="text-xs text-muted-foreground hover:text-rose-500 transition-colors flex items-center gap-1">
                              <AlertCircle size={13} />Отпиши
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {writtenOff.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3 text-right">{writtenOff.length} отписани актива</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}