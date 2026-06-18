import { db } from "@/lib/db/db";
import { invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Printer, CheckCircle, Send, Clock, AlertTriangle } from "lucide-react";
import { updateInvoiceStatus, deleteInvoice } from "../actions";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Chernova", color: "text-zinc-400", bg: "bg-zinc-800" },
  sent: { label: "Izpratena", color: "text-blue-400", bg: "bg-blue-950/60" },
  paid: { label: "Platena", color: "text-emerald-400", bg: "bg-emerald-950/60" },
  overdue: { label: "Zakasnyala", color: "text-red-400", bg: "bg-red-950/60" },
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;

  let inv: any = null;
  try {
    const rows = await (db as any)
      .select()
      .from(invoices)
      .where(eq((invoices as any).id, parseInt(id)))
      .limit(1);
    inv = rows[0] ?? null;
  } catch {}

  if (!inv) notFound();

  const invoiceNumber = inv.invoiceNumber ?? inv.invoice_number ?? "";
  const clientName = inv.clientName ?? inv.client_name ?? "";
  const clientAddress = inv.clientAddress ?? inv.client_address ?? "";
  const clientVatNumber = inv.clientVatNumber ?? inv.client_vat_number ?? "";
  const issueDate = inv.issueDate ?? inv.issue_date ?? "";
  const dueDate = inv.dueDate ?? inv.due_date ?? "";
  const status = inv.status ?? "draft";
  const notes = inv.notes ?? "";
  const items: any[] = Array.isArray(inv.items) ? inv.items : [];
  const subtotal = parseFloat(String(inv.subtotal ?? "0"));
  const vatAmount = parseFloat(String(inv.vatAmount ?? inv.vat_amount ?? "0"));
  const total = parseFloat(String(inv.total ?? "0"));

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8 print:bg-white print:text-black print:p-0">
      <div className="max-w-4xl mx-auto space-y-6 print:space-y-0">

        {/* Toolbar hidden on print */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Link
              href={`/${lang}/dashboard/accounting/invoices`}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/25 transition-all"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                <FileText size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{invoiceNumber}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-lg ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {status !== "paid" && (
              <form action={async () => {
                "use server";
                await updateInvoiceStatus(inv.id, "paid", lang);
              }}>
                <button type="submit" className="flex items-center gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 px-3 py-2 rounded-xl transition-colors font-medium">
                  <CheckCircle size={13} /> Platena
                </button>
              </form>
            )}
            {status === "draft" && (
              <form action={async () => {
                "use server";
                await updateInvoiceStatus(inv.id, "sent", lang);
              }}>
                <button type="submit" className="flex items-center gap-1.5 text-xs bg-blue-700 hover:bg-blue-600 px-3 py-2 rounded-xl transition-colors font-medium">
                  <Send size={13} /> Izprati
                  </button>
               </form>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs bg-white/8 hover:bg-white/15 border border-white/10 px-3 py-2 rounded-xl transition-colors"
            >
              <Printer size={13} /> PDF / Pechat
            </button>
          </div>
        </div>

        {/* Invoice document */}
        <div className="bg-white text-zinc-900 rounded-2xl p-10 print:rounded-none print:shadow-none print:p-8">

          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <div className="text-3xl font-bold text-orange-600 mb-1">FAKTURA</div>
              <div className="text-sm text-zinc-500 font-mono">{invoiceNumber}</div>
            </div>
            <div className="text-right text-sm">
              <div className="text-zinc-400">Data na izdavane</div>
              <div className="font-semibold">{issueDate}</div>
              <div className="text-zinc-400 mt-1">Srok za plashchane</div>
              <div className="font-semibold text-orange-600">{dueDate}</div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Izdatel</div>
              <div className="font-bold text-lg">Moyata Firma EOOD</div>
              <div className="text-sm text-zinc-500 mt-1">BG Bulgaria</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Klient</div>
              <div className="font-bold text-lg">{clientName}</div>
              {clientVatNumber && <div className="text-sm text-zinc-500">EIK/DDS: {clientVatNumber}</div>}
              {clientAddress && <div className="text-sm text-zinc-500 whitespace-pre-line">{clientAddress}</div>}
            </div>
          </div>

          {/* Line items table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-zinc-200">
                <th className="text-left text-xs font-semibold text-zinc-400 uppercase pb-2">Opisanie</th>
                <th className="text-right text-xs font-semibold text-zinc-400 uppercase pb-2">Kol.</th>
                <th className="text-right text-xs font-semibold text-zinc-400 uppercase pb-2">Tsena EUR</th>
                <th className="text-right text-xs font-semibold text-zinc-400 uppercase pb-2">DDS%</th>
                <th className="text-right text-xs font-semibold text-zinc-400 uppercase pb-2">Suma EUR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((it: any, i: number) => (
                <tr key={i}>
                  <td className="py-3 text-sm">{it.description}</td>
                  <td className="py-3 text-sm text-right tabular-nums">{it.quantity}</td>
                  <td className="py-3 text-sm text-right tabular-nums">{parseFloat(it.unitPrice).toFixed(2)}</td>
                  <td className="py-3 text-sm text-right tabular-nums">{it.vatRate}%</td>
                  <td className="py-3 text-sm text-right font-mono tabular-nums">{parseFloat(it.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Danychna osnova</span>
                <span className="font-mono tabular-nums">{subtotal.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>DDS</span>
                <span className="font-mono tabular-nums">{vatAmount.toFixed(2)} EUR</span>
              </div>
              <div className="border-t-2 border-zinc-800 pt-2 flex justify-between text-lg font-bold">
                <span>OBSHTO</span>
                <span className="font-mono tabular-nums text-orange-600">{total.toFixed(2)} EUR</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <div className="mt-10 pt-8 border-t border-zinc-200">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Belezhki</div>
              <div className="text-sm text-zinc-600 whitespace-pre-line">{notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
