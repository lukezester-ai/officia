'use client';
import { useState } from 'react';
import { Plus, Trash2, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Account { id: string; accountNumber: string; name: string; type: string; }
interface JournalLine { accountId: string; entryType: 'debit' | 'credit'; amount: string; description: string; }
interface Props { accounts: Account[]; onAdd: (entry: any) => void; }

const emptyLine = (): JournalLine => ({ accountId: '', entryType: 'debit', amount: '', description: '' });

export function JournalEntryDialog({ accounts, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);
  const [loading, setLoading] = useState(false);

  const totalDebit = lines.filter(l => l.entryType === 'debit').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const totalCredit = lines.filter(l => l.entryType === 'credit').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const updateLine = (index: number, field: keyof JournalLine, value: string) => {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (index: number) => { if (lines.length > 2) setLines(prev => prev.filter((_, i) => i !== index)); };

  const handleSubmit = async () => {
    if (!description.trim()) { toast.error('Въведи описание'); return; }
    if (!isBalanced) { toast.error('Дебит и кредит трябва да са равни'); return; }
    const validLines = lines.filter(l => l.accountId && parseFloat(l.amount) > 0);
    if (validLines.length < 2) { toast.error('Нужни са поне 2 реда'); return; }

    setLoading(true);
    await onAdd({
      description,
      entryDate,
      lines: validLines.map(l => ({ ...l, amount: parseFloat(l.amount) })),
    });
    setOpen(false);
    setDescription('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setLines([emptyLine(), emptyLine()]);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><BookOpen size={16} /> Ново вписване</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ново журнално вписване</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Описание</label>
              <Input placeholder="Напр. Издаване на фактура №1001" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Дата</label>
              <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Редове</label>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addLine}>
                <Plus size={12} /> Добави ред
              </Button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                <span className="col-span-4">Сметка</span>
                <span className="col-span-3">Вид</span>
                <span className="col-span-3">Сума (BGN)</span>
                <span className="col-span-2" />
              </div>
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                      value={line.accountId}
                      onChange={e => updateLine(idx, 'accountId', e.target.value)}
                    >
                      <option value="">— Сметка —</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.accountNumber} {acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                      value={line.entryType}
                      onChange={e => updateLine(idx, 'entryType', e.target.value as 'debit' | 'credit')}
                    >
                      <option value="debit">Дебит</option>
                      <option value="credit">Кредит</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min="0" step="0.01" placeholder="0.00" value={line.amount} onChange={e => updateLine(idx, 'amount', e.target.value)} />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => removeLine(idx)} disabled={lines.length <= 2}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`flex items-center justify-between p-3 rounded-lg text-sm ${isBalanced ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-muted'}`}>
            <div className="flex gap-6">
              <span>Дебит: <strong className="text-blue-600">{totalDebit.toFixed(2)} лв.</strong></span>
              <span>Кредит: <strong className="text-rose-600">{totalCredit.toFixed(2)} лв.</strong></span>
            </div>
            {!isBalanced && totalDebit > 0 && (
              <div className="flex items-center gap-1 text-amber-600 text-xs"><AlertCircle size={13} /> Небалансирано</div>
            )}
            {isBalanced && <span className="text-emerald-600 text-xs font-medium">✓ Балансирано</span>}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>Отказ</Button>
            <Button onClick={handleSubmit} disabled={loading || !isBalanced}>
              {loading ? 'Записване...' : 'Запази като чернова'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}