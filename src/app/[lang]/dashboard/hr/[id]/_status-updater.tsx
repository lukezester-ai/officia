'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { updateEmployeeStatus } from '../actions';
import { toast } from 'sonner';

export function StatusUpdater({ employeeId, currentStatus }: { employeeId: string, currentStatus: string }) {
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (status: string) => {
    setLoading(true);
    const res = await updateEmployeeStatus(employeeId, status);
    if (res.success) {
      toast.success('Статусът е обновен успішно!');
    } else {
      toast.error('Грешка: ' + res.error);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <Button 
        variant={currentStatus === 'at_work' ? 'default' : 'outline'} 
        className={currentStatus === 'at_work' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        onClick={() => handleUpdate('at_work')}
        disabled={loading}
      >
        На работа
      </Button>
      <Button 
        variant={currentStatus === 'on_leave' ? 'default' : 'outline'} 
        className={currentStatus === 'on_leave' ? 'bg-amber-500 hover:bg-amber-600' : ''}
        onClick={() => handleUpdate('on_leave')}
        disabled={loading}
      >
        Платен отпуск
      </Button>
      <Button 
        variant={currentStatus === 'sick_leave' ? 'default' : 'outline'} 
        className={currentStatus === 'sick_leave' ? 'bg-rose-500 hover:bg-rose-600' : ''}
        onClick={() => handleUpdate('sick_leave')}
        disabled={loading}
      >
        Болничен
      </Button>
      <Button 
        variant={currentStatus === 'unpaid_leave' ? 'default' : 'outline'} 
        className={currentStatus === 'unpaid_leave' ? 'bg-slate-600 hover:bg-slate-700' : ''}
        onClick={() => handleUpdate('unpaid_leave')}
        disabled={loading}
      >
        Неплатен отпуск
      </Button>
    </div>
  );
}
