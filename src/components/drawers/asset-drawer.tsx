'use client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Box, CheckCircle, Clock, FileText, Upload, AlertTriangle } from 'lucide-react';

export function AssetDrawer({ asset, open, onOpenChange }: { asset: any, open: boolean, onOpenChange: (open: boolean) => void }) {
  if (!asset) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto bg-slate-50 dark:bg-slate-900 border-l border-border">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Box size={18} className="text-indigo-500"/>
            <span className="truncate">{asset.name}</span>
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 pt-1">
            <Badge variant="outline" className="font-mono">{asset.inventoryNumber}</Badge>
            <span className="text-xs text-muted-foreground">
              {asset.isActive ? <span className="text-emerald-500">Активен</span> : 'Отписан'}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          
          {/* Warnings */}
          {!asset.documentId && (
            <div className="p-4 rounded-xl border bg-amber-50 border-amber-200 dark:bg-amber-950/30">
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-amber-700">
                <AlertTriangle size={16} /> Липсва документ
              </h4>
              <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
                Няма прикачена фактура за придобиване. Препоръчваме да качите документа за одитни цели.
              </p>
            </div>
          )}

          {/* 1. General Data */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">1. Общи данни</h3>
            <div className="bg-white dark:bg-slate-950 border border-border rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm border-b border-border pb-2">
                <span className="text-muted-foreground">Дата на придобиване</span>
                <span className="font-medium">{new Date(asset.acquisitionDate).toLocaleDateString('bg-BG')}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-border pb-2">
                <span className="text-muted-foreground">Стойност на придобиване</span>
                <span className="font-medium">{parseFloat(asset.acquisitionCost).toLocaleString('bg-BG')} лв.</span>
              </div>
              <div className="flex justify-between text-sm border-b border-border pb-2">
                <span className="text-muted-foreground">Сметка на актива</span>
                <span className="font-medium">204 (Машини и съоръжения)</span>
              </div>
            </div>
          </div>

          {/* 2. Amortization */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">2. Амортизация</h3>
            <div className="bg-white dark:bg-slate-950 border border-border rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm border-b border-border pb-2">
                <span className="text-muted-foreground">Метод</span>
                <span className="font-medium">{asset.amortizationMethod === 'straight_line' ? 'Линеен' : 'Дегресивен'}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-border pb-2">
                <span className="text-muted-foreground">Срок на годност</span>
                <span className="font-medium">{asset.usefulLifeMonths} месеца</span>
              </div>
            </div>
          </div>

          {/* 3. Documents */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider flex justify-between items-center">
              <span>3. Документи</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-indigo-500"><Upload size={14} className="mr-1"/> Добави</Button>
            </h3>
            <div className="bg-white dark:bg-slate-950 border border-border rounded-xl p-4">
              {asset.documentId ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle size={16} /> Прикачена фактура
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">Няма свързани документи.</p>
              )}
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
