"use client";
// @ts-nocheck

import React, { useState } from 'react';
import { Check, X, Calendar, AlertCircle } from 'lucide-react';
import { approveTask, rejectTask } from '../documents/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function TasksClient({ initialTasks }: { initialTasks: any[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const router = useRouter();

  const handleApprove = async (id: string) => {
    toast.promise(approveTask(id), {
      loading: 'Одобряване...',
      success: () => {
        setTasks(prev => prev.filter(t => t.id !== id));
        router.refresh();
        return 'Задачата е одобрена и добавена в графика!';
      },
      error: 'Грешка'
    });
  };

  const handleReject = async (id: string) => {
    toast.promise(rejectTask(id), {
      loading: 'Отхвърляне...',
      success: () => {
        setTasks(prev => prev.filter(t => t.id !== id));
        router.refresh();
        return 'Задачата е отхвърлена.';
      },
      error: 'Грешка'
    });
  };

  return (
    <div className="space-y-4">
      {tasks.length === 0 && (
        <div className="text-center p-12 bg-white/5 border border-white/10 rounded-2xl text-zinc-400">
          Няма нови задачи за одобрение.
        </div>
      )}
      
      {tasks.map(task => (
        <div key={task.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-start gap-4 hover:border-white/20 transition-all">
          <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl mt-1 shrink-0">
            <AlertCircle size={24} />
          </div>
          
          <div className="flex-1 w-full">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h3 className="font-bold text-lg">{task.title}</h3>
              {task.priority === 'high' && (
                <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/30">
                  Висок Приоритет
                </span>
              )}
            </div>
            
            <p className="text-zinc-400 text-sm mb-4">{task.description}</p>
            
            {task.dueDate && (
              <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 w-fit px-3 py-1.5 rounded-lg border border-amber-400/20">
                <Calendar size={14} />
                <span>Срок: {new Date(task.dueDate).toLocaleDateString('bg-BG')}</span>
              </div>
            )}
          </div>

          <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
            <button 
              onClick={() => handleApprove(task.id)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
            >
              <Check size={18} />
              Одобри
            </button>
            <button 
              onClick={() => handleReject(task.id)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 font-medium rounded-xl transition-colors"
            >
              <X size={18} />
              Отхвърли
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
