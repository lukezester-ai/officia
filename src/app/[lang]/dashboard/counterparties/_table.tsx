'use client';
// @ts-nocheck
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, UserX } from 'lucide-react';

const TYPES: Record<string, { label: string; cls: string }> = {
  client: { label: 'Клиент', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400' },
  supplier: { label: 'Доставчик', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400' },
  both: { label: 'Клиент/Дост.', cls: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-400' },
};

interface CounterpartyTableProps {
  data: any[];
  loading: boolean;
  onEdit: (item: any) => void;
  onDeactivate: (id: string) => void;
}

export function CounterpartyTable({ data, loading, onEdit, onDeactivate }: CounterpartyTableProps) {
  if (loading) {
    return <div className="py-10 text-center text-muted-foreground text-sm">Зарежда...</div>;
  }
  if (data.length === 0) {
    return <div className="py-10 text-center text-muted-foreground text-sm">Няма контрагенти.</div>;
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Наименование</TableHead>
            <TableHead>Вид</TableHead>
            <TableHead>ЕИК</TableHead>
            <TableHead>ДДС №</TableHead>
            <TableHead>Град</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((c: any) => {
            const typeInfo = TYPES[c.type] || { label: c.type, cls: '' };
            return (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell className="font-medium text-sm">
                  <div>{c.name}</div>
                  {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${typeInfo.cls}`}>
                    {typeInfo.label}
                  </span>
                </TableCell>
                <TableCell className="text-sm font-mono">{c.eik || '—'}</TableCell>
                <TableCell className="text-sm font-mono">{c.vatNumber || '—'}</TableCell>
                <TableCell className="text-sm">{c.city || '—'}</TableCell>
                <TableCell className="text-sm">{c.phone || '—'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => onEdit(c)}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500" onClick={() => onDeactivate(c.id)}>
                      <UserX size={13} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}