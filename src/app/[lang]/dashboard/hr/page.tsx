import { db } from "@/lib/db/db";
import { employees, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Users, UserCheck, Clock, UserX, Plus, Briefcase } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, {l:string;c:string}> = {
    active:   {l:"Активен",   c:"bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"},
    inactive: {l:"Неактивен", c:"bg-zinc-500/15 text-zinc-400 border border-zinc-500/30"},
    leave:    {l:"В отпуска", c:"bg-amber-500/15 text-amber-400 border border-amber-500/30"},
  };
  const s = cfg[status] ?? cfg.inactive;
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.c}`}>{s.l}</span>;
}

export default async function HRPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const [tenant] = await db.select().from(tenants).limit(1);
  let emps: any[] = [];
  try { if (tenant) emps = await db.select().from(employees).where(eq(employees.tenantId, tenant.id)); } catch {}
  const stats = [
    { label:"Общо", value:emps.length,                                      grad:"from-indigo-500 to-violet-600", Icon:Users },
    { label:"Активни", value:emps.filter(e=>e.status==="active").length,   grad:"from-emerald-500 to-teal-600",  Icon:UserCheck },
    { label:"Отпуска", value:emps.filter(e=>e.status==="leave").length,    grad:"from-amber-500 to-orange-600",  Icon:Clock },
    { label:"Неактивни", value:emps.filter(e=>e.status==="inactive").length,grad:"from-rose-500 to-pink-600",   Icon:UserX },
  ];  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25"><Users size={20} className="text-white"/></div>
            <div><h1 className="text-2xl font-bold">HR &amp; Кадри</h1><p className="text-zinc-400 text-sm">Управление на служители</p></div>
          </div>
          <a href={`/${lang}/dashboard/hr/new`} className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-amber-500/25"><Plus size={16}/>Нов служител</a>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s=>(
            <div key={s.label} className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-all">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center mb-3 shadow-lg`}><s.Icon size={18} className="text-white"/></div>
              <div className="text-2xl font-bold mb-0.5">{s.value}</div>
              <div className="text-xs text-zinc-400">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <h2 className="font-semibold flex items-center gap-2"><Briefcase size={16} className="text-amber-400"/>Служители</h2>
            <span className="text-xs text-zinc-400">{emps.length} записа</span>
          </div>
          {emps.length===0 ? (
            <div className="py-16 text-center"><Users size={36} className="text-zinc-700 mx-auto mb-3"/><p className="text-zinc-500 text-sm">Няма добавени служители</p></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-3">Служител</th><th className="px-6 py-3">Позиция</th><th className="px-6 py-3">Отдел</th><th className="px-6 py-3 text-right">Заплата</th><th className="px-6 py-3">Статус</th>
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {emps.map((e:any)=>(
                  <tr key={e.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4 font-medium">{e.firstName ? `${e.firstName} ${e.lastName}` : e.name}</td>
                    <td className="px-6 py-4 text-zinc-400">{e.position??"—"}</td>
                    <td className="px-6 py-4 text-zinc-400">{e.department??"—"}</td>
                    <td className="px-6 py-4 text-right">{e.salary ? `${Number(e.salary).toLocaleString("bg-BG")} лв.` : "—"}</td>
                    <td className="px-6 py-4"><StatusBadge status={e.status??"inactive"}/></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  );
}