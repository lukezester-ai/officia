// @ts-nocheck
import { db } from "@/lib/db/db";
import { invoices } from "@/lib/db/schema";
import { and, gte, lte, inArray } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, FileText, TrendingUp, TrendingDown, Calculator, Printer } from "lucide-react";
import VatB2GClient from "./VatB2GClient";

function getPeriodBounds(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year!, month! - 1, 1);
  const end = new Date(year!, month!, 0);
  return {
    start: start.toISOString().split("T")[0]!,
    end: end.toISOString().split("T")[0]!,
  };
}

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(period: string) {
  const [year, month] = period.split("-");
  const months = [
    "Yanuari","Fevruari","Mart","April","Mai","Yuni",
    "Yuli","Avgust","Septemvri","Oktomvri","Noemvri","Dekemvri",
  ];
  return `${months[parseInt(month!) - 1]} ${year}`;
}

function prevPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  if (m === 1) return `${y! - 1}-12`;
  return `${y}-${String(m! - 1).padStart(2, "0")}`;
}

function nextPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  if (m === 12) return `${y! + 1}-01`;
  return `${y}-${String(m! + 1).padStart(2, "0")}`;
}

export default async function VatPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  const period = sp.period ?? currentPeriod();
  const { start, end } = getPeriodBounds(period);

  let salesRows: any[] = [];
  try {
    salesRows = await (db as any)
      .select()
      .from(invoices)
      .where(
        and(
          inArray((invoices as any).status, ["sent", "paid"]),
          gte((invoices as any).issueDate, start),
          lte((invoices as any).issueDate, end)
        )
      );
  } catch {}

  const totalBase = salesRows.reduce(
    (s: number, r: any) => s + parseFloat(String(r.subtotal ?? r.sub_total ?? "0")),
    0
  );
  const totalVat = salesRows.reduce(
    (s: number, r: any) => s + parseFloat(String(r.vatAmount ?? r.vat_amount ?? "0")),
    0
  );
  const totalGross = salesRows.reduce(
    (s: number, r: any) => s + parseFloat(String(r.total ?? "0")),
    0
  );

  const prev = prevPeriod(period);
  const next = nextPeriod(period);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8 print:bg-white print:text-black print:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Link
              href={`/${lang}/dashboard/accounting`}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/25 transition-all"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Calculator size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">DDS Spravka</h1>
                <p className="text-zinc-400 text-sm">VAT Report</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <VatB2GClient period={period} />
            <a
              href={`/api/accounting/vat-export?year=${period.split('-')[0]}&month=${period.split('-')[1]}`}
              className="flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white transition-colors px-4 py-2 rounded-xl text-sm font-medium print:hidden shadow-sm"
              download
            >
              <FileText size={14} /> НАП Експорт (ZIP)
            </a>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 transition-colors px-4 py-2 rounded-xl text-sm font-medium print:hidden"
            >
              <Printer size={14} /> PDF / Pechat
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-3 print:hidden">
          <Link
            href={`/${lang}/dashboard/accounting/vat?period=${prev}`}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-zinc-400 hover:text-white"
          >
            &lsaquo;
          </Link>
          <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-2 text-sm font-semibold min-w-40 text-center">
            {periodLabel(period)}
          </div>
          <Link
            href={`/${lang}/dashboard/accounting/vat?period=${next}`}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-zinc-400 hover:text-white"
          >
            &rsaquo;
          </Link>
        </div>

        {/* Print header */}
        <div className="hidden print:block mb-8">
          <div className="text-3xl font-bold text-purple-700 mb-1">DDS SPRAVKA</div>
          <div className="text-zinc-500 text-sm">Period: {periodLabel(period)} ({start} -- {end})</div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 print:gap-2">
          {[
            {
              label: "Danychna osnova (prodazhbi)",
              value: totalBase,
              color: "text-white",
              border: "border-white/10",
              bg: "bg-white/3",
              icon: TrendingUp,
              iconColor: "text-zinc-400",
            },
            {
              label: "DDS varkhu prodazhbi (izkhodyasht)",
              value: totalVat,
              color: "text-violet-400",
              border: "border-violet-500/20",
              bg: "bg-violet-950/30",
              icon: Calculator,
              iconColor: "text-violet-400",
            },
            {
              label: "DDS za vnasvane",
              value: totalVat,
              color: "text-orange-400",
              border: "border-orange-500/20",
              bg: "bg-orange-950/30",
              icon: TrendingDown,
              iconColor: "text-orange-400",
            },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5`}>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
                <s.icon size={13} className={s.iconColor} />
                {s.label}
              </div>
              <div className={`text-2xl font-bold tabular-nums ${s.color}`}>
                {s.value.toFixed(2)}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">EUR</div>
            </div>
          ))}
        </div>

        {/* Sales invoices table */}
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3">
            <FileText size={16} className="text-violet-400" />
            <h2 className="text-sm font-semibold">Faktури s DDS -- {periodLabel(period)}</h2>
            <span className="ml-auto text-xs text-zinc-500">{salesRows.length} faktury</span>
          </div>

          {salesRows.length === 0 ? (
            <div className="p-12 text-center">
              <Calculator size={40} className="text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 text-sm">Nyama faktury za tozi period</p>
              <Link
                href={`/${lang}/dashboard/accounting/invoices/new`}
                className="inline-flex items-center gap-2 mt-4 text-xs bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl transition-colors"
              >
                Nova faktura
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-zinc-500 font-medium px-5 py-3">Nomer</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-5 py-3">Klient</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-5 py-3">Data</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-5 py-3">Status</th>
                  <th className="text-right text-xs text-zinc-500 font-medium px-5 py-3">Osnova EUR</th>
                  <th className="text-right text-xs text-zinc-500 font-medium px-5 py-3">DDS EUR</th>
                  <th className="text-right text-xs text-zinc-500 font-medium px-5 py-3">Obshto EUR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {salesRows.map((r: any) => {
                  const base = parseFloat(String(r.subtotal ?? r.sub_total ?? "0"));
                  const vat = parseFloat(String(r.vatAmount ?? r.vat_amount ?? "0"));
                  const gross = parseFloat(String(r.total ?? "0"));
                  const statusMap: Record<string, string> = {
                    draft: "text-zinc-400",
                    sent: "text-blue-400",
                    paid: "text-emerald-400",
                    overdue: "text-red-400",
                  };
                  const statusLabel: Record<string, string> = {
                    draft: "Chernova",
                    sent: "Izpratena",
                    paid: "Platena",
                    overdue: "Zakasnyala",
                  };
                  return (
                    <tr key={r.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono text-orange-400">
                        {r.invoiceNumber ?? r.invoice_number}
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-300">
                        {r.clientName ?? r.client_name}
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-400">
                        {r.issueDate ?? r.issue_date}
                      </td>
                      <td className={`px-5 py-3 text-xs ${statusMap[r.status] ?? "text-zinc-400"}`}>
                        {statusLabel[r.status] ?? r.status}
                      </td>
                      <td className="px-5 py-3 text-xs text-right tabular-nums text-zinc-300">
                        {base.toFixed(2)}
                        </td>
                      <td className="px-5 py-3 text-xs text-right tabular-nums text-violet-400 font-medium">
                        {vat.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-xs text-right tabular-nums font-mono font-bold">
                        {gross.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-white/10">
                <tr className="bg-white/3">
                  <td colSpan={4} className="px-5 py-3 text-xs font-bold text-zinc-300">OBSHTO</td>
                  <td className="px-5 py-3 text-xs text-right tabular-nums font-bold">{totalBase.toFixed(2)}</td>
                  <td className="px-5 py-3 text-xs text-right tabular-nums font-bold text-violet-400">{totalVat.toFixed(2)}</td>
                  <td className="px-5 py-3 text-xs text-right tabular-nums font-bold font-mono">{totalGross.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* VAT declaration summary box */}
        <div className="bg-violet-950/20 border border-violet-500/20 rounded-2xl p-6 print:border-zinc-300 print:bg-gray-50">
          <h2 className="text-sm font-bold mb-4 text-violet-300 print:text-violet-800">
            SPRAVKA-DEKLARATSIYA ZA DDS -- {periodLabel(period)}
          </h2>
          <div className="space-y-2 text-sm">
            {[
              { label: "Kolona 11 -- Danychna osnova izkhodyasht DDS", value: totalBase },
              { label: "Kolona 20 -- Izkhodyasht DDS (20%)", value: totalVat },
              { label: "Kolona 30 -- Vkhodyasht DDS za prispadvane", value: 0 },
              { label: "Kolona 50 -- DDS za vnasvane (+) / za vraztvane (-)", value: totalVat },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5 print:border-zinc-200">
                <span className="text-zinc-400 print:text-zinc-600">{row.label}</span>
                <span className={`font-mono tabular-nums font-bold ${row.value > 0 ? "text-violet-300 print:text-violet-800" : "text-zinc-400"}`}>
                  {row.value.toFixed(2)} EUR
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-4">
            * Vkhodyasht DDS se vpisvat rachno ot schetovoditelya vav sys&apos;tetemata na NRA.
          </p>
        </div>

      </div>
    </div>
  );
}
