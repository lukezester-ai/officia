'use client';
// @ts-nocheck

import { useState, useEffect, useRef, useCallback } from 'react';
import { getInventoryData, createInventoryItem, addInventoryMovement, processInventoryScan } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Tags, Box, ArrowDownToLine, ArrowUpFromLine, Scan, Zap, Search, CheckCircle } from 'lucide-react';

// Inline SVG icons (Camera and Wifi not available in this lucide-react build)
const CameraIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const WifiIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
    <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
    <line x1="12" y1="20" x2="12.01" y2="20"/>
  </svg>
);
import { toast } from 'sonner';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// ── Barcode scanner hook ─────────────────────────────────────────────────────
// Detects USB/Bluetooth HID barcode scanners (they type fast + send Enter)
function useBarcodeScanner(onScan: (code: string) => void) {
  const bufferRef = useRef('');
  const timerRef  = useRef<any>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if focus is inside an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 3) {
          onScan(bufferRef.current.trim());
        }
        bufferRef.current = '';
        clearTimeout(timerRef.current);
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
        clearTimeout(timerRef.current);
        // Scanners finish within 50ms; reset after 300ms idle
        timerRef.current = setTimeout(() => { bufferRef.current = ''; }, 300);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onScan]);
}

export default function InventoryPage() {
  const [data, setData]       = useState<any>({ items: [], totalStockValue: 0, totalItemsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  // Scan mode
  const [scanMode, setScanMode]         = useState<'idle' | 'camera' | 'manual'>('idle');
  const [scannedItem, setScannedItem]   = useState<any>(null);
  const [scanInput, setScanInput]       = useState('');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanInterval = useRef<any>(null);

  // Movement
  const [movementOpen, setMovementOpen]   = useState(false);
  const [movementType, setMovementType]   = useState<'in' | 'out'>('in');
  const [selectedItem, setSelectedItem]   = useState<any>(null);

  // New item
  const [newItemOpen, setNewItemOpen] = useState(false);

  const load = async () => {
    const res = await getInventoryData();
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // ── Find item by barcode/SKU ──────────────────────────────────────────────
  const findItem = useCallback((code: string) => {
    const found = data.items.find((i: any) =>
      i.sku?.toLowerCase() === code.toLowerCase() ||
      i.barcode?.toLowerCase() === code.toLowerCase()
    );
    return found || null;
  }, [data.items]);

  const handleScan = useCallback(async (code: string) => {
    if (!code?.trim()) return;

    // Local instant feedback
    const local = findItem(code);
    if (local) setScannedItem(local);

    // Cross-agent inventory_scan pipeline (inbox + optional journal)
    const res: any = await processInventoryScan({ code: code.trim(), autoIssue: false });
    if (res?.found && res.item) {
      const enriched = data.items.find((i: any) => i.id === res.item.id) || {
        ...res.item,
        currentQuantity: res.item.currentQuantity,
        averageUnitCost: 0,
      };
      setScannedItem(enriched);
      toast.success(`Сканиран: ${res.item.name}`, { description: 'AI pipeline уведоми склада и AI Inbox' });
      load();
    } else if (res && res.found === false) {
      setScannedItem(null);
      toast.error(`Непознат баркод: ${code}`, {
        description: 'Създадено е известие в AI Inbox за регистрация',
      });
    } else if (!local) {
      setScannedItem(null);
      toast.error(`Артикул "${code}" не е намерен`);
    }
  }, [findItem, data.items]);

  // USB/BT scanner listener (global keydown)
  useBarcodeScanner(handleScan);

  // ── Camera barcode scanning ───────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setScanMode('camera');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);

      // Use native BarcodeDetector API (Chrome 83+, Edge, Android)
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'codabar', 'itf'],
        });
        scanInterval.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              stopCamera();
              handleScan(codes[0].rawValue);
            }
          } catch {}
        }, 200);
      } else {
        toast.info('BarcodeDetector не се поддържа в този браузър. Използвайте ръчно въвеждане или Chrome.', { duration: 5000 });
      }
    } catch {
      toast.error('Не може да се достъпи камерата. Проверете разрешенията.');
    }
  };

  const stopCamera = () => {
    clearInterval(scanInterval.current);
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setScanMode('idle');
  };

  const openMovement = (type: 'in' | 'out', item: any) => {
    setSelectedItem(item);
    setMovementType(type);
    setMovementOpen(true);
  };

  const handleMovement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd  = new FormData(e.currentTarget);
    const qty = parseFloat(fd.get('quantity') as string);

    if (movementType === 'out' && selectedItem?.currentQuantity < qty) {
      toast.error('Няма достатъчна наличност!'); return;
    }

    const res = await addInventoryMovement({
      itemId:   selectedItem.id,
      type:     movementType,
      quantity: qty,
      unitCost: movementType === 'in'
        ? parseFloat(fd.get('unitCost') as string)
        : selectedItem.averageUnitCost,
    });

    if (res.success) {
      const auto = (res as any).automation;
      toast.success(
        movementType === 'in' ? 'Заприходено!' : 'Изписано!',
        {
          description: auto?.approval
            ? 'Контировка е изпратена за одобрение в AI Inbox'
            : auto?.lowStockTask
              ? 'Създадена задача за снабдяване (ниска наличност)'
              : undefined,
        },
      );
      setMovementOpen(false);
      setScannedItem(null);
      load();
    } else {
      toast.error('Грешка: ' + res.error);
    }
  };

  const handleCreateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sku = fd.get('sku') as string;
    const barcode = (fd.get('barcode') as string) || sku;
    const res = await createInventoryItem({
      sku,
      name: fd.get('name') as string,
      unitOfMeasure: fd.get('unitOfMeasure') as string,
      barcode,
    });
    if (res.success) {
      toast.success('Артикулът е създаден!', {
        description: 'AI pipeline регистрира продукта към складовата автоматизация',
      });
      setNewItemOpen(false);
      load();
    } else toast.error('Грешка: ' + res.error);
  };

  const filtered = data.items.filter((i: any) =>
    !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = data.items.filter((i: any) => i.currentQuantity <= 0);
  const criticalStock = data.items.filter((i: any) => i.currentQuantity > 0 && i.currentQuantity < 5);

  return (
    <div className="space-y-6 pb-10">
      {/* Low-stock alert banner */}
      {(lowStock.length > 0 || criticalStock.length > 0) && (
        <div className="space-y-2">
          {lowStock.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-rose-500/20 shrink-0">
                <Package size={18} className="text-rose-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-rose-400">⚠️ {lowStock.length} артикула с нулева наличност</p>
                <p className="text-sm text-rose-300/70">{lowStock.slice(0, 3).map((i: any) => i.name).join(', ')}{lowStock.length > 3 ? ` +${lowStock.length - 3} още` : ''}</p>
              </div>
            </div>
          )}
          {criticalStock.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-amber-500/20 shrink-0">
                <Box size={18} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-400">⚠️ {criticalStock.length} артикула с критично ниска наличност (&lt;5)</p>
                <p className="text-sm text-amber-300/70">{criticalStock.slice(0, 3).map((i: any) => `${i.name} (${i.currentQuantity} ${i.unitOfMeasure})`).join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Склад
            <span className="text-xs font-semibold px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md flex items-center gap-1">
              <Scan size={12} /> Баркод
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Заприходяване и изписване чрез баркод скенер или камера.</p>
        </div>
        <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500/50">
              <Plus size={16} /> Нов Артикул
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px] bg-zinc-950 border-white/10 text-zinc-200">
            <DialogHeader>
              <DialogTitle className="text-white">Нов артикул в номенклатурата</DialogTitle>
              <DialogDescription className="text-zinc-400">SKU кодът се ползва като баркод идентификатор.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateItem}>
              <div className="grid gap-4 py-4">
                {[
                  { id: 'sku', label: 'SKU', placeholder: 'напр. WATER-05', required: true },
                  { id: 'barcode', label: 'Баркод / QR', placeholder: 'напр. 5901234123457 (опционално)' },
                  { id: 'name', label: 'Наименование', placeholder: 'напр. Минерална вода 0.5л', required: true },
                  { id: 'unitOfMeasure', label: 'Мерна единица', placeholder: 'бр, кг, л, пакет...', required: true },
                ].map(f => (
                  <div key={f.id} className="space-y-1.5">
                    <label htmlFor={f.id} className="text-sm font-medium text-zinc-300">{f.label}</label>
                    <Input id={f.id} name={f.id} required={!!f.required} placeholder={f.placeholder} className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500" />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">Създай Артикул</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── SCAN PANEL ── */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">Бърз вход/изход чрез баркод</span>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
              <WifiIcon size={10} className="mr-1" /> USB/BT скенерът работи автоматично
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Manual scan input */}
            <div>
              <p className="text-xs text-zinc-500 mb-2">Ръчно въведи или сканирай SKU/баркод:</p>
              <div className="flex gap-2">
                <Input
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { handleScan(scanInput); setScanInput(''); } }}
                  placeholder="Сканирай или въведи баркод..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                />
                <Button onClick={() => { handleScan(scanInput); setScanInput(''); }} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 shrink-0">
                  <Search size={16} />
                </Button>
              </div>
            </div>

            {/* Camera scan */}
            <div>
              <p className="text-xs text-zinc-500 mb-2">Сканирай с камера (Chrome / Android):</p>
              {scanMode === 'camera' ? (
                <div className="relative">
                  <video ref={videoRef} className="w-full h-24 object-cover rounded-lg border border-emerald-500/30" autoPlay muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-16 border-2 border-emerald-400 rounded-md opacity-70" />
                  </div>
                  <Button size="sm" onClick={stopCamera} className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white h-7 text-xs">Стоп</Button>
                </div>
              ) : (
                <Button onClick={startCamera} variant="outline" className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-2">
                  <CameraIcon size={16} /> Отвори камера
                </Button>
              )}
            </div>
          </div>

          {/* Scanned item result */}
          {scannedItem && (
            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                <div>
                  <div className="text-white font-semibold">{scannedItem.name}</div>
                  <div className="text-xs text-zinc-400">SKU: {scannedItem.sku} · Наличност: <span className="text-emerald-400 font-bold">{scannedItem.currentQuantity} {scannedItem.unitOfMeasure}</span></div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={() => openMovement('in', scannedItem)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                  <ArrowDownToLine size={14} /> Вход
                </Button>
                <Button size="sm" onClick={() => openMovement('out', scannedItem)} className="bg-rose-600 hover:bg-rose-700 text-white gap-1">
                  <ArrowUpFromLine size={14} /> Изход
                </Button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-zinc-600 mt-3">
            💡 USB/Bluetooth баркод скенерите работят директно — насочете скенера към баркода без да кликате никъде.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Артикули', value: data.totalItemsCount, icon: Tags, color: 'text-indigo-400', glow: 'white' },
          { label: 'Общо количество', value: `${data.items.reduce((s: number, i: any) => s + i.currentQuantity, 0).toLocaleString()} бр.`, icon: Package, color: 'text-emerald-400', glow: 'emerald' },
          { label: 'Обща стойност', value: fmt(data.totalStockValue), icon: Box, color: 'text-violet-400', glow: 'violet' },
        ].map(s => (
          <Card key={s.label} className="border-white/10 bg-white/5 hover:border-white/20 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
                <s.icon size={14} className={s.color} /> {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="border-white/10 bg-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Номенклатура</h2>
          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Търси артикул..." className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 h-9" />
          </div>
        </div>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-zinc-500 py-16 text-center">Зареждане...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/10">
                  {['SKU / Баркод', 'Наименование', 'Наличност', 'Ср. цена', 'Стойност', 'Действия'].map(h => (
                    <TableHead key={h} className={`text-zinc-400 text-xs ${h === 'Действия' ? 'text-right pr-6' : h !== 'SKU / Баркод' ? 'text-right' : 'pl-6'}`}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item: any) => (
                  <TableRow key={item.id} className="hover:bg-white/3 border-white/10 transition-colors group">
                    <TableCell className="pl-6">
                      <div className="font-mono text-xs text-zinc-400 flex items-center gap-1.5">
                        <Scan size={11} className="text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                        {item.sku}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-zinc-200">{item.name}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold tabular-nums ${item.currentQuantity <= 0 ? 'text-rose-400' : item.currentQuantity < 5 ? 'text-amber-400' : 'text-white'}`}>
                        {item.currentQuantity}
                      </span>
                      <span className="text-zinc-500 text-xs ml-1">{item.unitOfMeasure}</span>
                      {item.currentQuantity <= 0 && <Badge className="ml-2 bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px]">Изчерпан</Badge>}
                      {item.currentQuantity > 0 && item.currentQuantity < 5 && <Badge className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Малко</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-400 text-sm">{fmt(item.averageUnitCost)}</TableCell>
                    <TableCell className="text-right tabular-nums text-violet-300 font-medium">{fmt(item.currentValue)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-8 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 gap-1" onClick={() => openMovement('in', item)}>
                          <ArrowDownToLine size={13} /> Вход
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20 gap-1" onClick={() => openMovement('out', item)}>
                          <ArrowUpFromLine size={13} /> Изход
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-zinc-500">
                      {search ? `Няма резултати за "${search}"` : 'Складът е празен. Добавете артикули.'}
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
        <DialogContent className="sm:max-w-[420px] bg-zinc-950 border-white/10 text-zinc-200">
          <DialogHeader>
            <DialogTitle className={`text-white flex items-center gap-2`}>
              {movementType === 'in'
                ? <><ArrowDownToLine size={18} className="text-emerald-400" /> Заприходяване</>
                : <><ArrowUpFromLine size={18} className="text-rose-400" /> Изписване</>
              }
            </DialogTitle>
            {selectedItem && (
              <DialogDescription className="text-zinc-400">
                <strong className="text-zinc-200">{selectedItem.name}</strong> · Наличност: <span className="text-emerald-400 font-bold">{selectedItem.currentQuantity} {selectedItem.unitOfMeasure}</span>
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handleMovement}>
              <div className="grid gap-4 py-4">
                <div className="space-y-1.5">
                  <label htmlFor="quantity" className="text-sm font-medium text-zinc-300">Количество ({selectedItem.unitOfMeasure})</label>
                  <Input id="quantity" name="quantity" type="number" step="0.001" min="0.001" required autoFocus
                    className="bg-white/5 border-white/10 text-white text-lg font-bold focus-visible:ring-indigo-500" />
                </div>
                {movementType === 'in' && (
                  <div className="space-y-1.5">
                    <label htmlFor="unitCost" className="text-sm font-medium text-zinc-300">Единична цена (лв/ед)</label>
                    <Input id="unitCost" name="unitCost" type="number" step="0.01" min="0" required
                      className="bg-white/5 border-white/10 text-white focus-visible:ring-indigo-500" />
                  </div>
                )}
                {movementType === 'out' && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 bg-white/5 rounded-lg p-3">
                    <Box size={14} /> Изписва се по средна претеглена цена: <strong className="text-zinc-300">{fmt(selectedItem.averageUnitCost)}</strong>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" className={`w-full text-white ${movementType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                  {movementType === 'in' ? '✅ Заприходи' : '📤 Изпиши'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
