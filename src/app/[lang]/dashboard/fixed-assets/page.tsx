'use client';
import { useState, useEffect } from 'react';
import { getFixedAssets, createFixedAsset, writeOffAsset, calcCurrentBookValue, calcDepreciationSchedule } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Package, TrendingDown, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const METHODS = [
  { value: 'straight_line', label: 'Линеен' },
  { value: 'declining_balance', label: 'Ускорен (намаляваща база)' },
];
const MONTHS_BG = ['Яну','Фев','Мар','Апр','Май','Юни','Юли','Авг','Сеп','Окт','Ное','Дек'];

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AddAssetDialog({ onAdd }: { onAdd: (a: any) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    inventoryNumber: '', name: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionCost: '', salvageValue: '0',
    usefulLifeMonths: '60', amortizationMethod: 'straight_line',
  });
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  const monthlyDep = Math.round(
    ((parseFloat(form.acquisitionCost) || 0) - (parseFloat(form.salvageValue) || 0))
    / (parseInt(form.usefulLifeMonths) || 1) * 100
  ) / 100;

  const handleSubmit = async () => {
    if (!form.inventoryNumber.trim()) { toast.error('Въведи инвентарен номер'); return; }
    if (!form.name.trim()) { toast.error('Въведи наименование'); return; }
    if (!form.acquisitionCost || parseFloat(form.acquisitionCost) <= 0) { toast.error('Въведи стойност'); return; }
    setLoading(true);
    await onAdd({ ...form, acquisitionCost: parseFloat(form.acquisitionCost), salvageValue: parseFloat(form.salvageValue) || 0, usefulLifeMonths: parseInt(form.usefulLifeMonths) });
    setOpen(false);
    setForm({ inventoryNumber: '', name: '', acquisitionDate: new Date().toISOString().split('T')[0], acquisitionCost: '', salvageValue: '0', usefulLifeMonths: '60', amortizationMethod: 'straight_line' });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus size={15} /> Нов актив</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Добавяне на ДМА</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Инвент. номер *</label><Input placeholder="ДМА-001" value={form.inventoryNumber} onChange={e => set('inventoryNumber', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Наименование *</label><Input placeholder="Лек автомобил" value={form.name} onChange={e => set('name', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Дата придобиване</label><Input type="date" value={form.acquisitionDate} onChange={e => set('acquisitionDate', e.target.value)} /></div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Метод</label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none" value={form.amortizationMethod} onChange={e => set('amortizationMethod', e.target.value)}>
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Отч. стойност *</label><Input type="number" min="0" step="0.01" placeholder="0.00" value={form.acquisitionCost} onChange={e => set('acquisitionCost', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Остатъчна ст.</label><Input type="number" min="0" step="0.01" placeholder="0.00" value={form.salvageValue} onChange={e => set('salvageValue', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Срок (месеци)</label><Input type="number" min="1" max="600" value={form.usefulLifeMonths} onChange={e => set('usefulLifeMonths', e.target.value)} /></div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Амортизируема стойност:</span><span className="font-mono">{fmt((parseFloat(form.acquisitionCost)||0)-(parseFloat(form.salvageValue)||0))} лв.</span></div>
            <div className="flex justify-between font-medium"><span className="text-muted-foreground">Месечна амортизация:</span><span className="font-mono text-amber-600">{fmt(monthlyDep)} лв.</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Годишна амортизация:</span><span className="font-mono">{fmt(monthlyDep*12)} лв.</span></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Отказ</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Записване...' : 'Добави'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssetRow({ asset, onWriteOff }: { asset: any; onWriteOff: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cost = parseFloat(asset.acquisitionCost);
  const salvage = parseFloat(asset.salvageValue || '0');
  const months = parseInt(asset.usefulLifeMonths);
  const params = { acquisitionDate: asset.acquisitionDate, acquisitionCost: cost, salvageValue: salvage, usefulLifeMonths: months, amortizationMethod: asset.amortizationMethod };
  const current = calcCurrentBookValue(params);
  const depPct = Math.round((current.accumulated / (cost - salvage || 1)) * 100);
  const schedule = expanded ? calcDepreciationSchedule(params) : [];
  const now = new Date();

  return (
    <>
      <TableRow className={`group ${!asset.isActive ? 'opacity-50' : ''}`}>
        <TableCell>
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-primary hover:underline font-mono text-sm">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {asset.inventoryNumber}
          </button>
        </TableCell>
        <TableCell className="font-medium">{asset.name}</TableCell>
        <TableCell className="text-muted-foreground text-sm">{asset.acquisitionDate ? new Date(asset.acquisitionDate).toLocaleDateString('bg-BG') : '—'}</TableCell>
        <TableCell className="text-right font-mono">{fmt(cost)} лв.</TableCell>
        <TableCell className="text-right font-mono text-amber-600">{fmt(current.accumulated)} лв.</TableCell>
        <TableCell className="text-right font-mono font-semibold">{fmt(current.bookValue)} лв.</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-16">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(depPct, 100)}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{depPct}%</span>
          </div>
        </TableCell>
        <TableCell>
          {asset.isActive
            ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Активен</Badge>
            : <Badge className="bg-gray-50 text-gray-500 border-gray-200 text-xs">Отписан</Badge>}
        </TableCell>
        <TableCell>
          {asset.isActive && (
            <Button variant="ghost" size="sm" className="h-7 text-xs opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50" onClick={() => onWriteOff(asset.id)}>Отпиши</Button>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={9} className="bg-muted/30 p-0">
            <div className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Амортизационен план — {asset.name} ({METHODS.find(m => m.value === asset.amortizationMethod)?.label})
              </p>
              <div className="rounded-md border bg-background overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Период</TableHead>
                      <TableHead className="text-right text-xs">Амортизация</TableHead>
                      <TableHead className="text-right text-xs">Натрупана</TableHead>
                      <TableHead className="text-right text-xs">Балансова стойност</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.map((row, i) => {
                      const isCurrent = row.month === now.getMonth()+1 && row.year === now.getFullYear();
                      return (
                        <TableRow key={i} className={isCurrent ? 'bg-indigo-50 dark:bg-indigo-950/30 font-semibold' : ''}>
                          <TableCell className="text-xs py-1.5">
                            {isCurrent && <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 mb-0.5" />}
                            {MONTHS_BG[row.month-1]} {row.year}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs py-1.5 text-amber-600">{fmt(row.depreciation)}</TableCell>
                          <TableCell className="text-right font-mono text-xs py-1.5 text-muted-foreground">{fmt(row.accumulated)}</TableCell>
                          <TableCell className="text-right font-mono text-xs py-1.5">{fmt(row.bookValue)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFixedAssets().then(res => { if (res.success) setAssets(res.data); setLoading(false); });
  }, []);

  const handleAdd = async (data: any) => {
    const res = await createFixedAsset(data);
    if (res.success && res.data) { setAssets(prev => [res.data, ...prev]); toast.success(`${data.name} е добавен!`); }
    else toast.error('Грешка: ' + res.error);
  };

  const handleWriteOff = async (id: string) => {
    const res = await writeOffAsset(id);
    if (res.success) { setAssets(prev => prev.map(a => a.id === id ? { ...a, isActive: false } : a)); toast.success('Активът е отписан.'); }
    else toast.error('Грешка: ' + res.error);
  };

  const active = assets.filter(a => a.isActive);
  const totalCost = active.reduce((s, a) => s + parseFloat(a.acquisitionCost||'0'), 0);
  const totals = active.reduce((acc, a) => {
    const cv = calcCurrentBookValue({ acquisitionDate: a.acquisitionDate, acquisitionCost: parseFloat(a.acquisitionCost), salvageValue: parseFloat(a.salvageValue||'0'), usefulLifeMonths: parseInt(a.usefulLifeMonths), amortizationMethod: a.amortizationMethod });
    return { bookValue: acc.bookValue + cv.bookValue, monthly: acc.monthly + cv.monthlyDepreciation };
  }, { bookValue: 0, monthly: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Дълготрайни активи</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Регистър на ДМА и амортизационен план.</p>
        </div>
        <AddAssetDialog onAdd={handleAdd} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5"><Package size={14} /> Активни ДМА</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{active.length}</div><div className="text-xs text-muted-foreground">отч. стойност {fmt(totalCost)} лв.</div></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5"><TrendingDown size={14} className="text-amber-600" /> Балансова стойност</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-indigo-600">{fmt(totals.bookValue)} лв.</div><div className="text-xs text-muted-foreground">натрупана аморт. {fmt(totalCost - totals.bookValue)} лв.</div></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5"><AlertCircle size={14} className="text-amber-500" /> Месечна амортизация</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{fmt(totals.monthly)} лв.</div><div className="text-xs text-muted-foreground">годишно {fmt(totals.monthly * 12)} лв.</div></CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Регистър на ДМА</CardTitle>
          <p className="text-sm text-muted-foreground">Кликни на инвент. номер за да разгънеш амортизационния план.</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Зареждане...</p>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Package size={40} className="mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Няма регистрирани активи.<br />Добави нов с бутона горе.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Инв. №</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead>Придобит</TableHead>
                  <TableHead className="text-right">Отч. стойност</TableHead>
                  <TableHead className="text-right">Натруп. аморт.</TableHead>
                  <TableHead className="text-right">Балансова ст.</TableHead>
                  <TableHead className="w-32">Изхабяване</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map(asset => <AssetRow key={asset.id} asset={asset} onWriteOff={handleWriteOff} />)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}