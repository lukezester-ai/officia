import { db } from "@/lib/db/db";
import { invoices, documents } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Clock, Receipt, FileText, TrendingUp } from "@/components/icons";
import { requireTenant } from "@/lib/auth/get-tenant";
import { getInvoiceEffectiveAmount } from "@/lib/utils/invoice-amount";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "сега";
  if (minutes < 60) return `${minutes} мин`;
  if (hours < 24) return `${hours} ч`;
  return `${days} д`;
}

export async function RecentActivity() {
  const { tenantId } = await requireTenant();
  let items: {
    id: string;
    label: string;
    sub: string;
    time: Date;
    Icon: typeof Receipt;
    color: string;
  }[] = [];

  try {
    const [invoiceRows, documentRows] = await Promise.all([
      db.select().from(invoices).where(eq(invoices.tenantId, tenantId)).orderBy(desc(invoices.createdAt)).limit(6),
      db.select().from(documents).where(eq(documents.tenantId, tenantId)).orderBy(desc(documents.createdAt)).limit(4),
    ]);

    items = [
      ...invoiceRows.map((row) => ({
        id: `i-${row.id}`,
        label: `Фактура ${row.invoiceNumber || row.id.slice(0, 6)}`,
        sub: `${getInvoiceEffectiveAmount(row).toFixed(2)} €`,
        time: row.createdAt ?? new Date(),
        Icon: Receipt,
        color: "text-indigo-400",
      })),
      ...documentRows.map((row) => ({
        id: `d-${row.id}`,
        label: row.title || "Документ",
        sub: row.type || "Общ",
        time: row.createdAt ?? new Date(),
        Icon: FileText,
        color: "text-blue-400",
      })),
    ]
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 8);
  } catch (error) {
    console.error("[RecentActivity]", error);
  }

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <TrendingUp size={15} className="text-indigo-400" />
          Последна активност
        </h2>
        <span className="text-xs text-zinc-500">{items.length > 0 ? `${items.length} записа` : ""}</span>
      </div>
      {items.length === 0 ? (
        <div className="py-14 text-center">
          <Clock size={32} className="text-zinc-700 mx-auto" />
          <p className="text-zinc-500 text-sm mt-3">Все още няма активност</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-6 py-3 hover:bg-white/3 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <item.Icon size={15} className={item.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{item.label}</div>
                <div className="text-xs text-zinc-500 truncate">{item.sub}</div>
              </div>
              <div className="text-xs text-zinc-600">{timeAgo(item.time)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
