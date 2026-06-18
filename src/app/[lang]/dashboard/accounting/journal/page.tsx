import { db } from "@/lib/db/db";
import { journalEntries } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import Link from "next/link";
import { BookOpen, Plus, TrendingUp, ArrowUpDown, Zap } from "lucide-react";

export default async function JournalPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  let entries: any[] = [];
  let totalDebit = 0, totalCredit = 0;

  try {
    entries = await db.select().from(journalEntries as any)
      .orderBy(desc((journalEntries as any).createdAt))
      .limit(100);
    totalDebit = entries.reduce((s: number, e: any) => s + Number(e.debitAmount ?? e.debit_amount ?? 0), 0);
    totalCredit = entries.reduce((s: number, e: any) => s + Number(e.creditAmount ?? e.credit_amount ?? 0), 0);
  } catch { /* table not ready */ }

  const stats = [
    { label: "Записвания", value: entries.length, color: "from-violet-500 to-purple-600" },
    { label: "Общ дебит", value: totalDebit.toFixed(2) + " лв.", color: "from-blue-500 to-cyan-600" },
    { label: "Общ кредит", value: totalCredit.toFixed(2) + " лв.", color: "from-emerald-500 to-teal-600" },
    { label: "Баланс", value: (totalDebit - totalCredit).toFixed(2) + " лв.", color: Math.abs(totalDebit - totalCredit) < 0.01 ? "from-emerald-500 to-teal-600" : "from-red-500 to-rose-600" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Счетоводен журнал</h1>
              <p className="text-zinc-400 text-sm">Двойно счетоводство · Дебит = Кредит</p>
            </div>
          </div>
          <Link href={`/${lang}/dashboard/accounting/journal/new`}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 transition-all px-5 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-violet-500/25">
            <Plus size={16} /> Ново записване
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-all">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                <TrendingUp size={14} className="text-white" />
              </div>
              <div className="text-xl font-bold tabular-nums">{s.value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <ArrowUpDown size={14} className="text-violet-400" /> Всички записвания
            </h2>
            <span className="text-xs text-zinc-500">{entries.length} записа</span>
          </div>
          {entries.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen size={36} className="text-zinc-700 x-auto mb-3" />
              <p className="text-zinc-500 text-sm mb-4">Няма счетоводни записвания</p>
              <Link href={`/${lang}/dashboard/accounting/journal/new`}
                className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-xl border border-white/10 hover:border-violet-500/30 text-zinc-400 hover:text-white transition-all">
                <Plus size={13} /> Създай първото записване
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/5 bg-white/2">
                    <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Дата</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Референция</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Описание</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Дт сметка</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Кт сметка</th>
                    <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Дебит</th>
                    <th className="text-right px-6 py-3 text-xs text-zinc-500 font-medium">Кредит</th>
                </tr></thead>
                <tbody className="divide-y divide-white/5">
                  {entries.map((e: any) => (
                    <tr key={e.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-6 py-3 text-zinc-400 text-xs tabular-nums">{e.entryDate??e.entry_date?new Date(e.entryDate??e.entry_date).toLocaleDateString("bg-BG"):"-"}</td>
                      <td className="px-4 py-3 text-violet-400 font-mono text-xs">{e.referenceNumber??e.reference_number??"-"}</td>
                      <td className="px-4 py-3 text-white max-w-xs truncate">{e.description??"-"}</td>
                      <td className="px-4 py-3 text-zinc-300 font-mono text-xs">{e.debitAccount??e.debit_account??"-"}</td>
                      <td className="px-4 py-3 text-zinc-300 font-mono text-xs">{e.creditAccount??e.credit_account??"-"}</td>
                      <td className="px-4 py-3 text-right text-blue-400 font-mono text-xs tabular-nums">{e.debitAmount??e.debit_amount?Number(e.debitAmount??e.debit_amount).toFixed(2):"-"}</td>
                      <td className="px-6 py-3 text-right text-emerald-400 font-mono text-xs tabular-nums">{e.creditAmount??e.credit_amount?Number(e.creditAmount??e.credit_amount).toFixed(2):"-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="bg-gradient-to-r from-violet-600/10 to-purple-600/10 border border-violet-500/20 rounded-2xl p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Zap size={16} className="text-violet-400"/> Автоматични записвания</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[{trigger:"Hздадена фактура",dt:"411 Клиенти",ct:"701 Приходи + 4532 ДДУ"},{trigger:"Получена фактура",dt:"601 Разходи + 4531 ДДС",ct:"401 Вженятар"},{trigger:"Банкова транзакция",dt:"503 Разплащателна",ct:"411/401"},{trigger:"Амортизация месечна",dt:"603 Амортизации",ct:"241 Амортизация д А �"}].map(r=> <div key={r.trigger} className="bg-white/5 rounded-xl p-4 text-xs"><div className="font-medium text-white mb-2">{r.trigger}</div><div className="text-blue-400">ДТ {r.dt}</div><div className="text-emerald-400">КТ {r.ct}</div></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
