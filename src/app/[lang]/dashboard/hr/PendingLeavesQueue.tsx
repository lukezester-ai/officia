'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPendingLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from './actions';

const leaveTypeLabels: Record<string, string> = {
  annual: 'Платен отпуск', sick: 'Болничен', unpaid: 'Неплатен', maternity: 'Майчинство', parental: 'Родителски', other: 'Друг',
};

export function PendingLeavesQueue() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await getPendingLeaveRequests();
      if (res.success) setLeaves(res.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return null;
  if (leaves.length === 0) return null;

  const handleApprove = async (id: string) => {
    setProcessing(id);
    const res = await approveLeaveRequest(id);
    setProcessing(null);
    if (!res.success) return toast.error(res.error);
    toast.success('Заявката е одобрена.');
    setLeaves((prev) => prev.filter((l) => l.id !== id));
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    const res = await rejectLeaveRequest(id);
    setProcessing(null);
    if (!res.success) return toast.error(res.error);
    toast.success('Заявката е отказана.');
    setLeaves((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <Card className="shadow-sm border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-amber-400">
          <Calendar size={18} />
          Чакащи заявки за отпуск ({leaves.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {leaves.map((leave) => (
          <div key={leave.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-200">{leave.employeeName}</p>
                <p className="text-xs text-zinc-400">
                  {leaveTypeLabels[leave.type] || leave.type} — {new Date(leave.startDate).toLocaleDateString('bg-BG')} до {new Date(leave.endDate).toLocaleDateString('bg-BG')} ({leave.daysRequested} дни)
                </p>
                {leave.reason && <p className="text-xs text-zinc-500 mt-0.5">{leave.reason}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-amber-400 border-amber-800/50">Чакащ</Badge>
              <Button size="sm" variant="ghost" className="h-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20" onClick={() => handleApprove(leave.id)} disabled={processing === leave.id}>
                {processing === leave.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => handleReject(leave.id)} disabled={processing === leave.id}>
                {processing === leave.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
