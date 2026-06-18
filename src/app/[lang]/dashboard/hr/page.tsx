import { db } from "@/lib/db/db";
import { tenants } from "@/lib/db/schema";
import { Users, UserCheck, Clock, UserPlus, Briefcase } from "lucide-react";

export default async function HRPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const emps: any[] = [];
  const stats = [
    { label: "Общо", value: emps.length, grad: "from-indigo-500 to-violet-600", Icon: Users },
    { label: "Активни", value: 0, grad: "from-emerald-500 to-teal-600", Icon: UserCheck },
    { label: "Отпуска", value: 0, grad: "from-amber-500 to-orange-600", Icon: Clock },
    { label: "Нови (месец)", value: 0, grad: "from-rose-500 to-pink-600", Icon: UserPlus },
  ];
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Човешки ресурси</h1>
              <p className="text-zinc-400 text-sm">Управление на служители и заплати</p>
            </div>
          </div>
          <a href={`/${lang}/dashboard/hr/new`} className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 transition-all px-5 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-rose-500/25">
            <UserPlus size={16} /> Нов служител
          </a>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-all">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center mb-3 shadow-lg`}>
                <s.Icon size={18} className="text-white" />
              </div>
              <div className="text-2xl font-bold mb-0.5">{s.value}</div>
              <div className="text-xs text-zinc-400">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <h2 className="font-semibold flex items-center gap-2">
              <Briefcase size={16} className="text-rose-400" /> Служители
            </h2>
          </div>
          <div className="py-16 text-center">
            <Users size={36} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm mb-4">Няма добавени служители</p>
            <a href={`/${lang}/dashboard/hr/new`} className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-xl border border-white/10 hover:border-rose-500/30 text-zinc-400 hover:text-white transition-all">
              <UserPlus size={13} /> Добави първия служител
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
