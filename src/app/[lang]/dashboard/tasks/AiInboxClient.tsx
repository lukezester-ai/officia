"use client";
import React, { useState } from 'react';
import { Check, X, Inbox, AlertTriangle, Clock } from 'lucide-react';
import { resolveInboxItem } from '../ai-inbox/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

function riskLabel(item: any) {
  const risk = item?.metaJson?.risk || item?.priority || 'normal';
  if (risk === 'critical') return 'critical';
  if (risk === 'high') return 'high';
  return risk;
}

export default function AiInboxClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems || []);
  const router = useRouter();

  const resolve = async (id: string, resolution: 'accepted' | 'rejected') => {
    toast.promise(resolveInboxItem(id, resolution), {
      loading: resolution === 'accepted' ? 'Approving...' : 'Rejecting...',
      success: () => {
        setItems((prev) => prev.filter((item) => item.id !== id));
        router.refresh();
        return resolution === 'accepted' ? 'AI request approved.' : 'AI request rejected.';
      },
      error: 'Action failed',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Inbox size={18} className="text-violet-400" />
        <h2 className="text-lg font-semibold">AI approval queue</h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300">{items.length}</span>
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400">
          No pending AI approval requests.
        </div>
      )}

      {items.map((item) => {
        const risk = riskLabel(item);
        return (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-white/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <AlertTriangle size={17} className={risk === 'critical' ? 'text-red-400' : 'text-amber-400'} />
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <span className={risk === 'critical' ? 'rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-xs text-red-300' : 'rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300'}>
                    {risk}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">{item.description || 'AI requested human review before changing business data.'}</p>
                {item.createdAt && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                    <Clock size={13} />
                    {new Date(item.createdAt).toLocaleString('bg-BG')}
                  </div>
                )}
                {item.metaJson?.summary && (
                  <pre className="mt-3 max-h-40 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">
                    {JSON.stringify(item.metaJson.summary, null, 2)}
                  </pre>
                )}
              </div>

              <div className="flex gap-2 md:flex-col">
                <button onClick={() => resolve(item.id, 'accepted')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  <Check size={16} /> Approve
                </button>
                <button onClick={() => resolve(item.id, 'rejected')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-red-500/20 hover:text-red-300">
                  <X size={16} /> Reject
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
