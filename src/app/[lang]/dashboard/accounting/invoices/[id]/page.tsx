import { db } from "@/lib/db/db";
import { invoices, invoiceLines } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/auth/get-tenant";
import { parseUuidParam } from "@/lib/utils/ids";
import { PrintButton } from "@/components/print-button";
import { updateInvoiceStatus } from "../actions";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Чернова", color: "text-zinc-400", bg: "bg-zinc-800" },
  sent: { label: "Изпратена", color: "text-blue-400", bg: "bg-blue-950/60" },
  paid: { label: "Платена", color: "text-emerald-400", bg: "bg-emerald-950/60" },
  overdue: { label: "Закъсняла", color: "text-red-400", bg: "bg-red-950/60" },
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const invoiceId = parseUuidParam(id);
  if (!invoiceId) notFound();

  const { tenantId, tenant } = await requireTenant();
  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
    .limit(1);

  if (!inv) notFound();

  const storedLines = await db
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, invoiceId));

  const invoiceNumber = inv.invoiceNumber ?? "";
  const clientName = inv.clientName || inv.counterpartyName || "";
  const clientAddress = inv.clientAddress || inv.counterpartyAddress || "";
  const clientVatNumber = inv.clientVatNumber || inv.counterpartyVat || inv.counterpartyEik || "";
  const issueDate = inv.issueDate ?? "";
  const dueDate = inv.dueDate ?? "";
  const status = inv.status ?? "draft";
  const notes = inv.notes ?? "";
  const items = storedLines.length > 0
    ? storedLines.map((line) => ({
        description: line.description ?? "",
        quantity: line.quantity ?? "0",
        unitPrice: line.unitPrice ?? "0",
        vatRate: line.vatRate ?? "0",
        total: line.lineNet ?? "0",
      }))
    : Array.isArray(inv.items)
      ? inv.items
      : [];
  const subtotal = parseFloat(String(inv.subtotal || inv.netAmount || "0"));
  const vatAmount = parseFloat(String(inv.vatAmount ?? "0"));
  const total = parseFloat(String((Number(inv.total || 0) ? inv.total : inv.totalAmount) || "0"));
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const issuerName = String(tenant?.name ?? "");
  const issuerEik = String(tenant?.bulstat ?? "");
  const issuerVat = String(tenant?.vat_number ?? tenant?.vatNumber ?? "");
  const issuerAddress = String(tenant?.address ?? "");

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8 print:bg-white print:text-black print:p-0">
      <div className="max-w-4xl mx-auto space-y-6 print:space-y-0">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Link
              href={`/${lang}/dashboard/accounting/invoices`}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/25 transition-all"
            >
              <span aria-hidden="true">&larr;</span>
            </Link>
            <div>
              <h1 className="text-xl font-bold">{invoiceNumber}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-lg ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {status !== "paid" && (
              <form action={async () => {
                "use server";
                await updateInvoiceStatus(inv.id, "paid", lang);
              }}>
                <button type="submit" className="flex items-center gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 px-3 py-2 rounded-xl transition-colors font-medium">
                  Платена
                </button>
              </form>
            )}
            {status === "draft" && (
              <form action={async () => {
                "use server";
                await updateInvoiceStatus(inv.id, "sent", lang);
              }}>
                <button type="submit" className="flex items-center gap-1.5 text-xs bg-blue-700 hover:bg-blue-600 px-3 py-2 rounded-xl transition-colors font-medium">
                  Изпрати
                </button>
              </form>
            )}
            <PrintButton
              label="PDF / Печат"
              className="flex items-center gap-1.5 text-xs bg-white/8 hover:bg-white/15 border border-white/10 px-3 py-2 rounded-xl transition-colors print:hidden"
            />
          </div>
        </div>

        <div className="bg-white text-zinc-900 rounded-2xl p-10 print:rounded-none print:shadow-none print:p-8">
          <div className="flex justify-between items-start mb-10">
            <div>
              <div className="text-3xl font-bold text-orange-600 mb-1">ФАКТУРА</div>
              <div className="text-sm text-zinc-500 font-mono">{invoiceNumber}</div>
            </div>
            <div className="text-right text-sm">
              <div className="text-zinc-400">Дата на издаване</div>
              <div className="font-semibold">{issueDate}</div>
              <div className="text-zinc-400 mt-1">Срок за плащане</div>
              <div className="font-semibold text-orange-600">{dueDate}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Издател</div>
              <div className="font-bold text-lg">{issuerName || "—"}</div>
              {issuerEik && <div className="text-sm text-zinc-500">ЕИК: {issuerEik}</div>}
              {issuerVat && <div className="text-sm text-zinc-500">ДДС: {issuerVat}</div>}
              {issuerAddress && <div className="text-sm text-zinc-500 whitespace-pre-line">{issuerAddress}</div>}
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Клиент</div>
              <div className="font-bold text-lg">{clientName}</div>
              {clientVatNumber && <div className="text-sm text-zinc-500">ЕИК/ДДС: {clientVatNumber}</div>}
              {clientAddress && <div className="text-sm text-zinc-500 whitespace-pre-line">{clientAddress}</div>}
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-zinc-200">
                <th className="text-left text-xs font-semibold text-zinc-400 uppercase pb-2">Описание</th>
                <th className="text-right text-xs font-semibold text-zinc-400 uppercase pb-2">Кол.</th>
                <th className="text-right text-xs font-semibold text-zinc-400 uppercase pb-2">Цена EUR</th>
                <th className="text-right text-xs font-semibold text-zinc-400 uppercase pb-2">ДДС%</th>
                <th className="text-right text-xs font-semibold text-zinc-400 uppercase pb-2">Сума EUR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((it: { description?: string; quantity?: string | number; unitPrice?: string | number; vatRate?: string | number; total?: string | number }, i: number) => (
                <tr key={i}>
                  <td className="py-3 text-sm">{it.description}</td>
                  <td className="py-3 text-sm text-right tabular-nums">{it.quantity}</td>
                  <td className="py-3 text-sm text-right tabular-nums">{parseFloat(String(it.unitPrice ?? 0)).toFixed(2)}</td>
                  <td className="py-3 text-sm text-right tabular-nums">{it.vatRate}%</td>
                  <td className="py-3 text-sm text-right font-mono tabular-nums">{parseFloat(String(it.total ?? 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-1">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Данъчна основа</span>
                <span className="font-mono tabular-nums">{subtotal.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>ДДС</span>
                <span className="font-mono tabular-nums">{vatAmount.toFixed(2)} EUR</span>
              </div>
              <div className="border-t-2 border-zinc-800 pt-2 flex justify-between text-lg font-bold">
                <span>ОБЩО</span>
                <span className="font-mono tabular-nums text-orange-600">{total.toFixed(2)} EUR</span>
              </div>
            </div>
          </div>

          {notes && (
            <div className="mt-10 pt-8 border-t border-zinc-200">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Бележки</div>
              <div className="text-sm text-zinc-600 whitespace-pre-line">{notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
