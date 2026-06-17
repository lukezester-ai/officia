'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, UserX, UsersRound } from 'lucide-react';
import { CounterpartyDialog } from './_dialog';

const TYPES = [
  { value: 'client', label: 'Клиент', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'supplier', label: 'Доставчик', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'both', label: 'Клиент и доставчик', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export function CounterpartyTable({ items, onEdit, onDeactivate }: {
  items: any[];
  onEdit: (id: string, data: any) => Promise<void>;
  onDeactivate: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <UsersRound size={40} className="mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Няма контрагенти в тази категория.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Наименование</TableHead>
          <TableHead>Тип</TableHead>
          <TableHead>ЕИК</TableHead>
          <TableHead>ДДС №</TableHead>
          <TableHead>Град</TableHead>
          <TableHead>МОЛ</TableHead>
          <TableHead>Телефон / Имейл</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(c => {
          const typeInfo = TYPES.find(t => t.value === c.type) || TYPES[0];
          return (
            <TableRow key={c.id} className={`group ${!c.isActive ? 'opacity-50' : ''}`}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>
                <Badge className={`text-xs ${typeInfo.color}`}>{typeInfo.label}</Badge>
              </TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">{c.eik || '—'}</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">{c.vatNumber || '—'}</TableCell>
              <TableCell className="text-sm">{c.city || '—'}</TableCell>
              <TableCell className="text-sm">{c.contactPerson || '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {c.phone && <div>{c.phone}</div>}
                {c.email && <div className="text-xs">{c.email}</div>}
                {!c.phone && !c.email && '—'}
              </TableCell>
              <TableCell>
                {c.isActive
                  ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Активен</Badge>
                  : <Badge className="bg-gray-50 text-gray-500 border-gray-200 text-xs">Неактивен</Badge>}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <CounterpartyDialog
                    initial={{
                      type: c.type, name: c.name, eik: c.eik||'',
                      vatNumber: c.vatNumber||'', address: c.address||'',
                      city: c.city||'', email: c.email||'', phone: c.phone||'',
                      contactPerson: c.contactPerson||'', notes: c.notes||''
                    }}
                    onSave={(data) => onEdit(c.id, data)}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                        <Pencil size={13} />
                      </Button>
                    }
                  />
                  {c.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                      onClick={() => onDeactivate(c.id)}
                    >
                      <UserX size={13} />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}