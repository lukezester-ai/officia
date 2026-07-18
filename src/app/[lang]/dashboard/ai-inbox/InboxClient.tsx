"use client";

import { useState, useEffect } from "react";
import { getInboxItems, resolveInboxItem } from "./actions";
import { Loader2, AlertTriangle, ShieldAlert, CheckCircle, Clock } from "lucide-react";

export default function InboxClient() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getInboxItems();
      setItems(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleResolve = async (id: string, resolution: "accepted" | "rejected" | "snoozed" | "resolved") => {
    await resolveInboxItem(id, resolution);
    loadItems(); // Refresh
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="animate-spin w-8 h-8 mb-4 text-violet-500" />
        <p>Зареждане на AI Inbox...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-emerald-500 w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Всичко е наред</h2>
        <p className="text-slate-500">Няма нови аномалии за преглед.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const isCritical = item.priority === 'critical';
        const isHigh = item.priority === 'high';
        
        return (
          <div key={item.id} className={`p-6 rounded-2xl border ${
            isCritical ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50' :
            isHigh ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50' :
            'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
          }`}>
            <div className="flex gap-4 items-start">
              <div className="mt-1">
                {isCritical ? <ShieldAlert className="text-rose-500" size={24} /> :
                 isHigh ? <AlertTriangle className="text-amber-500" size={24} /> :
                 <AlertTriangle className="text-violet-500" size={24} />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-bold text-lg ${
                    isCritical ? 'text-rose-700 dark:text-rose-400' :
                    isHigh ? 'text-amber-700 dark:text-amber-400' :
                    'text-slate-800 dark:text-slate-200'
                  }`}>{item.title}</h3>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{item.description}</p>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleResolve(item.id, 'resolved')}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Маркирай като проверено
                  </button>
                  <button 
                    onClick={() => handleResolve(item.id, 'snoozed')}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Отложи
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
