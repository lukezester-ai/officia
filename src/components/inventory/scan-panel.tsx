'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  lookupItemByCode,
  quickInventoryMovement,
  createInventoryItem,
  type InventoryItemView,
} from '@/app/[lang]/dashboard/inventory/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScanLine, ArrowDownToLine, ArrowUpFromLine, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductCodeType } from '@/lib/inventory/codes';

type ScanPanelProps = {
  onChanged: () => void;
};

export function InventoryScanPanel({ onChanged }: ScanPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState<InventoryItemView | null>(null);
  const [pendingCode, setPendingCode] = useState<{ code: string; codeType: ProductCodeType } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [pendingQty, setPendingQty] = useState(1);
  const [unitCost, setUnitCost] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const resetScan = useCallback(() => {
    setQuery('');
    setItem(null);
    setPendingCode(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const runLookup = useCallback(async (raw: string) => {
    const code = raw.trim();
    if (!code) return;

    setLoading(true);
    const res = await lookupItemByCode(code);
    setLoading(false);

    if (!res.success) {
      toast.error(res.error || 'Грешка при търсене');
      return;
    }

    if (res.data) {
      setItem(res.data);
      setPendingCode(null);
      toast.success(`Намерен: ${res.data.name}`);
      return;
    }

    setItem(null);
    setPendingCode({
      code: res.scannedCode || code,
      codeType: res.suggestedType || 'internal',
    });
    setCreateOpen(true);
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await runLookup(query);
  };

  const runMovement = async (type: 'in' | 'out', quantity: number, withCost?: number) => {
    if (!item) return;

    if (type === 'in' && item.averageUnitCost <= 0 && withCost === undefined) {
      setPendingQty(quantity);
      setUnitCost('');
      setCostOpen(true);
      return;
    }

    setLoading(true);
    const res = await quickInventoryMovement({
      itemId: item.id,
      type,
      quantity,
      unitCost: withCost,
    });
    setLoading(false);

    if (res.success) {
      toast.success(type === 'in' ? `+${quantity} заприходени` : `-${quantity} изписани`);
      onChanged();
      const refresh = await lookupItemByCode(item.sku);
      if (refresh.success && refresh.data) {
        setItem(refresh.data);
      }
      inputRef.current?.focus();
    } else {
      toast.error(res.error || 'Грешка');
    }
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingCode) return;

    const fd = new FormData(event.currentTarget);
    const res = await createInventoryItem({
      sku: (fd.get('sku') as string) || pendingCode.code,
      name: fd.get('name') as string,
      unitOfMeasure: fd.get('unitOfMeasure') as string,
      extraCode: pendingCode.code,
    });

    if (res.success) {
      toast.success('Артикулът е създаден');
      setCreateOpen(false);
      onChanged();
      await runLookup(pendingCode.code);
    } else {
      toast.error(res.error || 'Грешка');
    }
  };

  return (
    <>
      <Card className="border-indigo-500/30 bg-indigo-500/5 shadow-[0_0_24px_rgba(79,70,229,0.08)]">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-200">
            <ScanLine size={16} className="text-indigo-400" />
            Сканирай или въведи код (EAN, SKU, вътрешен)
          </div>

          <form onSubmit={onSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Сканирай баркод и натисни Enter…"
                className="pl-9 bg-zinc-950 border-white/10 focus-visible:ring-indigo-500 font-mono"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              Търси
            </Button>
            {item && (
              <Button type="button" variant="outline" onClick={resetScan} className="border-white/10">
                <X size={16} />
              </Button>
            )}
          </form>

          <p className="text-xs text-zinc-500">
            USB/Bluetooth скенер работи директно — фокусът остава в полето и кодът се изпраща с Enter.
          </p>

          {item && (
            <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-zinc-500 font-mono mt-1">
                    SKU: {item.sku}
                    {item.codes.length > 1 && (
                      <span className="ml-2">
                        · {item.codes.length} кода (
                        {item.codes
                          .slice(0, 3)
                          .map((c) => c.code)
                          .join(', ')}
                        )
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                    {item.currentQuantity}{' '}
                    <span className="text-sm text-zinc-500 font-normal">{item.unitOfMeasure}</span>
                  </p>
                  <p className="text-xs text-zinc-500">средна цена: {item.averageUnitCost.toFixed(2)} €</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  disabled={loading}
                  onClick={() => runMovement('in', 1)}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                >
                  <ArrowDownToLine size={14} /> +1
                </Button>
                <Button
                  disabled={loading}
                  onClick={() => runMovement('in', 10)}
                  className="bg-emerald-700 hover:bg-emerald-800 gap-1"
                >
                  <ArrowDownToLine size={14} /> +10
                </Button>
                <Button
                  disabled={loading}
                  onClick={() => runMovement('out', 1)}
                  variant="outline"
                  className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10 gap-1"
                >
                  <ArrowUpFromLine size={14} /> -1
                </Button>
                <Button
                  disabled={loading}
                  onClick={() => runMovement('out', 10)}
                  variant="outline"
                  className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10 gap-1"
                >
                  <ArrowUpFromLine size={14} /> -10
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-white/10 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-white">Нов артикул от сканиран код</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Кодът <span className="font-mono text-indigo-300">{pendingCode?.code}</span> (
              {pendingCode?.codeType}) не е намерен. Създай артикул.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">SKU</label>
                <Input
                  name="sku"
                  defaultValue={pendingCode?.code}
                  required
                  className="bg-white/5 border-white/10 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Наименование</label>
                <Input name="name" required className="bg-white/5 border-white/10" placeholder="Наименование на стоката" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Мерна единица</label>
                <Input name="unitOfMeasure" defaultValue="бр" required className="bg-white/5 border-white/10" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Plus size={16} /> Създай и продължи
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={costOpen} onOpenChange={setCostOpen}>
        <DialogContent className="sm:max-w-[360px] bg-zinc-950 border-white/10 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-white">Единична цена</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Артикулът няма себестойност. Въведете цена за заприходяване на {pendingQty} бр.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
              placeholder="0.00 €"
              className="bg-white/5 border-white/10"
            />
          </div>
          <DialogFooter>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={!unitCost || parseFloat(unitCost) <= 0}
              onClick={async () => {
                setCostOpen(false);
                await runMovement('in', pendingQty, parseFloat(unitCost));
              }}
            >
              Заприходи
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
