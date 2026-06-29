import Link from "next/link";
import { Waves, ArrowLeft } from "lucide-react";
export default async function CashFlowPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/${lang}/dashboard/accounting/reports`} className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/25 transition-all"><ArrowLeft size={16}/></Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25"><Waves size={20} className="text-white"/></div>
            <div><h1 className="text-2xl font-bold">Паричен Поток</h1><p className="text-zinc-400 text-sm">Cash Flow Statement</p></div>
          </div>
        </div>
        <div className="bg-violet-950/20 border border-violet-500/20 rounded-2xl p-12 text-center">
          <Waves size={48} className="text-violet-400 mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">Cash Flow - Скоро</h3>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">Отчетът за паричния поток ще бъде имплементиран в следващата фаза. Ще изчислява движението по сметки 501 и 503.</p>
        </div>
      </div>
    </div>
  );
}
