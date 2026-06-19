// @ts-nocheck
'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus } from 'lucide-react';

export function EmployeeDialog({ onAddEmployee }: { onAddEmployee: (employee: any) => void }) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [salary, setSalary] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !position) return;

    onAddEmployee({
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@officia.bg`,
      position,
      department,
      salary: parseFloat(salary).toFixed(2),
      joinDate: new Date().toISOString().split('T')[0],
    });

    setFirstName('');
    setLastName('');
    setPosition('');
    setDepartment('');
    setSalary('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#4F46E5] hover:bg-[#4338CA] gap-2">
          <UserPlus size={16} /> Добави Служител
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Нов Служител</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Име</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Фамилия</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Позиция</label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Отдел</label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Месечна Заплата (BGN)</label>
            <Input type="number" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} required />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" className="bg-[#4F46E5] hover:bg-[#4338CA]">
              Запази
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
