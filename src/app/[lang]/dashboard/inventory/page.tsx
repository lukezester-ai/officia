'use client';
import { useState, useEffect } from 'react';
import { getInventoryData, createInventoryItem, addInventoryMovement } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, Plus, LogIn, LogOut, Tags, Box, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { toast } from 'sonner';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function InventoryPage() {
  const [data, setData] = useState<any>({ items: [], totalStockValue: 0, totalItemsCount: 0 });
  const [loading, setLoading] = useState(true);

  // Modals state
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  const load = async () => {
    const res = await getInventoryData();
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await createInventoryItem({
      sku: fd.get('sku') as string,
      name: fd.get('name') as string,
      unitOfMeasure: fd.get('unitOfMeasure') as string,
    });
    if (res.success) {
      toast.success("Артикулът е създаден!");
      setNewItemOpen(false);
      load();
    } else {
      toast.error("Грешка: " + res.error);
    }
  };

  const handleMovement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qty = parseFloat(fd.get('quantity') as string);
    const unitCost = movementType === 'in' ? parseFloat(fd.get('unitCost') as string) : 0; // out takes avg cost dynamically later, for MVP we can pass 0 or current avg
    
    // Quick validation
    if (movementType === 'out') {
      const item = data.items.find((i: any) => i.id === selectedItemId) as any;
      if (!item || item.currentQuantity < qty) {
        toast.error("Няма достатъчна наличност за изписване!");
        return;
      }
    }

    const res = await addInventoryMovement({
      itemId: selectedItemId,
      type: movementType,
      quantity: qty,
      unitCost: movementType === 'in' ? unitCost : (data.items.find((i: any) => i.id === selectedItemId) as any).averageUnitCost
    });

    if (res.success) {
      toast.success(movementType === 'in' ? "Успешно заприходяване!" : "Успешно изписване!");
      setMovementOpen(false);
      load();
    } else {
      toast.error("Грешка: " + res.error);
    }
  };

  const openMovementDialog = (type: 'in' | 'out', itemId: string) => {
    setMovementType(type);
    setSelectedItemId(itemId);
    setMovementOpen(true);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Склад (Наличности)
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Управление на артикули, заприходяване и изписване.</p>
        </div>
        
        <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] border border-indigo-500/50">
              <Plus size={16} /> Нов Артикул
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-white/10 text-zinc-200">
            <DialogHeader>
              <DialogTitle className="text-white">Създаване на артикул</DialogTitle>
              <DialogDescription className="text-zinc-400">Добавете нова стока или материал в номенклатурата.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateItem}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="sku" className="text-sm font-medium">SKU (Код)</label>
                  <Input id="sku" name="sku" required className="bg-white/5 border-white/10 focus-visible:ring-indigo-500" placeholder="напр. IT-001" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Наименование</label>
                  <Input id="name" name="name" required className="bg-white/5 border-white/10 focus-visible:ring-indigo-500" placeholder="напр. Лаптоп Lenovo ThinkPad" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="unitOfMeasure" className="text-sm font-medium">Мерна единица</label>
                  <Input id="unitOfMeasure" name="unitOfMeasure" required className="bg-white/5 border-white/10 focus-visible:ring-indigo-500" placeholder="напр. бр, кг, пакет" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">Създай Артикул</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <Tags size={14} className="text-indigo-400" /> Уникални Артикули
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white tabular-nums drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{data.totalItemsCount}</div></CardContent>
        </Card>
        
        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <Package size={14} className="text-emerald-400" /> Общо Количество
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              {data.items.reduce((s: number, i: any) => s + i.currentQuantity, 0).toLocaleString()} бр.
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-violet-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <Box size={14} className="text-violet-400" /> Обща Стойност
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-400 tabular-nums drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]">{fmt(data.totalStockValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-white/10 bg-white/5 overflow-hidden">
        <div className="bg-black/20 px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Номенклатура и наличности</h2>
        </div>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
             <p className="text-sm text-zinc-500 py-16 text-center">Зареждане на склад...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="pl-6 text-zinc-400">SKU</TableHead>
                  <TableHead className="text-zinc-400">Наименование</TableHead>
                  <TableHead className="text-right text-zinc-400">Наличност</TableHead>
                  <TableHead className="text-right text-zinc-400">Средна Цена</TableHead>
                  <TableHead className="text-right text-zinc-400">Обща Стойност</TableHead>
                  <TableHead className="text-right pr-6 text-zinc-400">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item: any) => (
                  <TableRow key={item.id} className="hover:bg-white/5 border-white/10 transition-colors">
                    <TableCell className="pl-6 font-mono text-xs text-zinc-400">{item.sku}</TableCell>
                    <TableCell className="font-medium text-zinc-200">{item.name}</TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-white">
                      {item.currentQuantity} <span className="text-zinc-500 text-xs font-normal">{item.unitOfMeasure}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-400">{fmt(item.averageUnitCost)}</TableCell>
                    <TableCell className="text-right tabular-nums text-violet-300 font-medium">{fmt(item.currentValue)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-8 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" onClick={() => openMovementDialog('in', item.id)}>
                          <ArrowDownToLine size={14} className="mr-1" /> Вход
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20" onClick={() => openMovementDialog('out', item.id)}>
                          <ArrowUpFromLine size={14} className="mr-1" /> Изход
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-zinc-500">
                      <p>Складът е празен. Създайте нов артикул.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Movement Dialog */}
      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-white/10 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-white">
              {movementType === 'in' ? 'Заприходяване на стока' : 'Изписване на стока'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Въведете количеството, което влиза или излиза от склада.
            </DialogDescription>
          </DialogHeader>
          {selectedItemId && (
            <form onSubmit={handleMovement}>
              <div className="grid gap-4 py-4">
                <div className="bg-white/5 p-3 rounded-md text-sm mb-2">
                  <span className="text-zinc-400 block mb-1">Артикул:</span>
                  <strong className="text-white">{(data.items.find((i: any) => i.id === selectedItemId) as any)?.name}</strong>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-zinc-400">Текуща наличност:</span>
                    <span className="text-emerald-400 font-bold">{(data.items.find((i: any) => i.id === selectedItemId) as any)?.currentQuantity} {(data.items.find((i: any) => i.id === selectedItemId) as any)?.unitOfMeasure}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="quantity" className="text-sm font-medium">Количество</label>
                  <Input id="quantity" name="quantity" type="number" step="0.001" min="0.001" required className="bg-white/5 border-white/10 focus-visible:ring-indigo-500" />
                </div>
                
                {movementType === 'in' && (
                  <div className="space-y-2">
                    <label htmlFor="unitCost" className="text-sm font-medium">Единична цена (Себестойност)</label>
                    <Input id="unitCost" name="unitCost" type="number" step="0.01" min="0" required className="bg-white/5 border-white/10 focus-visible:ring-indigo-500" />
                  </div>
                )}
                {movementType === 'out' && (
                  <div className="text-xs text-zinc-500 flex items-center gap-2 mt-2">
                    <Box size={14} /> Изписването става по среднопретеглена цена.
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" className={movementType === 'in' ? "bg-emerald-600 hover:bg-emerald-700 w-full text-white" : "bg-rose-600 hover:bg-rose-700 w-full text-white"}>
                  {movementType === 'in' ? 'Заприходи' : 'Изпиши'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
