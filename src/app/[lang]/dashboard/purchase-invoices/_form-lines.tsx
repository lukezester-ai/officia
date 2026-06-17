'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

const VAT_RATES = [20, 9, 0];

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PurchaseInvoiceLines({ lines, computedLines, onAdd, onRemove, onChange }: {
  lines: any[];
  computedLines: any[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onChange: (i: number, f: string, v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Редове</p>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Описание</th>
              <th className="text-right px-3 py-2 font-medium w-20">Кол.</th>
              <th className="text-right px-3 py-2 font-medium w-28">Ед. цена</th>
              <th className="text-right px-3 py-2 font-medium w-20">ДДС %</th>
              <th className="text-right px-3 py-2 font-medium w-28">Сума</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8 text-sm border-0 shadow-none focus-visible:ring-0"
                    placeholder="Стока / услуга"
                    value={line.description}
                    onChange={e => onChange(i, 'description', e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8 text-sm text-right border-0 shadow-none focus-visible:ring-0"
                    type="number" min="0" step="0.001"
                    value={line.quantity}
                    onChange={e => onChange(i, 'quantity', e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8 text-sm text-right border-0 shadow-none focus-visible:ring-0"
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={line.unitPrice}
                    onChange={e => onChange(i, 'unitPrice', e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    className="w-full h-8 rounded border border-input bg-background px-2 text-sm outline-none"
                    value={line.vatRate}
                    onChange={e => onChange(i, 'vatRate', e.target.value)}
                  >
                    {VAT_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-sm">
                  {fmt(computedLines[i].total)}
                </td>
                <td className="px-1 py-1.5">
                  {lines.length > 1 && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-rose-400"
                      onClick={() => onRemove(i)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onAdd}>
        <Plus size={13} /> Добави ред
      </Button>
    </div>
  );
}
