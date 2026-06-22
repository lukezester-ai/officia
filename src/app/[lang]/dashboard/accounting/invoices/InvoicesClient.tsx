"use client";
// @ts-nocheck

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  Plus,
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  Send,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { deleteInvoice } from "./actions";

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  status: string;
  total: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft: { label: "Chernova", color: "text-zinc-400", bg: "bg-zinc-800", icon: Clock },
  sent: { label: "Izpratena", color: "text-blue-400", bg: "bg-blue-950/60", icon: Send },
  paid: { label: "Platena", color: "text-emerald-400", bg: "bg-emerald-950/60", icon: CheckCircle },
  overdue: { label: "Zakasnyala", color: "text-red-400", bg: "bg-red-950/60", icon: AlertTriangle },
};

export default function InvoicesClient({
  lang,
  invoices,
}: {
  lang: string;
  invoices: Invoice[];
}) {
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState<number | null>(null);

  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  const counts = {
    all: invoices.length,
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent").length,
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
  };

  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + parseFloat(i.total), 0);

  const totalPending = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + parseFloat(i.total), 0);

  const handleDelete = async (id: number) => {
    if (!confirm("Iztrii tazi faktura?")) return;
    setDeleting(id);
    await deleteInvoice(id, lang);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/${lang}/dashboard/accounting`}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/25 transition-all"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <FileText size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Fakturi</h1>
                <p className="text-zinc-400 text-sm">Invoices</p>
              </div>
            </div>
          </div>
          <Link
            href={`/${lang}/dashboard/accounting/invoices/new`}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 transition-colors px-4 py-2 rounded-xl text-sm font-medium"
          >
            <Plus size={16} /> Nova faktura
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Plateni", value: totalPaid, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-950/30" },
            { label: "Ochakva se", value: totalPending, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-950/30" },
            { label: "Obshto fakturi", value: invoices.length, color: "text-white", border: "border-white/10", bg: "bg-white/3", isCount: true },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5`}>
              <div className="text-xs text-zinc-400 mb-2">{s.label}</div>
              <div className={`text-2xl font-bold tabular-nums ${s.color}`}>
                {(s as any).isCount ? s.value : `${(s.value as number).toFixed(2)}`}
              </div>
              {!(s as any).isCount && <div className="text-xs text-zinc-500 mt-0.5">EUR</div>}
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "draft", "sent", "paid", "overdue"] as const).map((f) => {
            const cfg = f === "all" ? null : STATUS_CONFIG[f];
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-white/15 text-white border border-white/20"
                    : "bg-white/5 text-zinc-400 border border-white/8 hover:bg-white/10"
                }`}
              >
                {cfg && <cfg.icon size={11} />}
                {f === "all" ? "Vsichki" : cfg?.label}
                <span className="ml-1 text-zinc-500">
                  {counts[f]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Invoice list */}
        {filtered.length === 0 ? (
          <div className="bg-orange-950/20 border border-orange-500/20 rounded-2xl p-12 text-center">
            <FileText size={48} className="text-orange-400 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Nyama fakturi</h3>
            <p className="text-zinc-400 text-sm mb-6">
              {filter === "all" ? "Syzdai pyrvata si faktura." : `Nyama fakturi so status: ${STATUS_CONFIG[filter]?.label}.`}
            </p>
            <Link
              href={`/${lang}/dashboard/accounting/invoices/new`}
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 transition-colors px-4 py-2 rounded-xl text-sm font-medium"
            >
              <Plus size={14} /> Nova faktura
            </Link>
          </div>
        ) : (
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {filtered.map((inv) => {
                const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft;
                const Icon = cfg.icon;
                const isOverdue =
                  inv.status === "sent" && new Date(inv.dueDate) < new Date();
                return (
                  <div
                    key={inv.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors group"
                  >
                    <div className="flex-1 min-w-0 grid grid-cols-4 gap-4 items-center">
                      <div>
                        <div className="text-sm font-mono font-bold text-orange-400">
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5 truncate">
                          {inv.clientName}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-400">Izd.: {inv.issueDate}</div>
                        <div className={`text-xs mt-0.5 ${isOverdue ? "text-red-400" : "text-zinc-500"}`}>
                          Srok: {inv.dueDate}
                        </div>
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.color}`}
                        >
                          <Icon size={10} />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold tabular-nums">
                          {parseFloat(inv.total).toFixed(2)}
                        </div>
                        <div className="text-xs text-zinc-500">EUR</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/${lang}/dashboard/accounting/invoices/${inv.id}`}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center transition-colors"
                        title="Pregled"
                      >
                        <Eye size={13} />
                      </Link>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        disabled={deleting === inv.id}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-950/60 hover:text-red-400 flex items-center justify-center transition-colors"
                        title="Iztrii"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
