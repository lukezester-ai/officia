"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Plus, Trash2, Save, Send } from "lucide-react";
import { createInvoice } from "../actions";

interface Item {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

function genNumber() {
  const now = new Date();
  return `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 900) + 100)}`;
}

function today() {
  return new Date().toISOString().split("T")[0] ?? "";
}

function dueIn(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0] ?? "";
}

export default function NewInvoicePage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = params.lang;

  const [invoiceNumber, setInvoiceNumber] = useState(genNumber);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientVat, setClientVat] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(() => dueIn(30));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, vatRate: 20, total: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const updateItem = (id: string, field: keyof Item, value: string | number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      })
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0, vatRate: 20, total: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const vatAmount = items.reduce((s, it) => s + it.total * (it.vatRate / 100), 0);
  const total = subtotal + vatAmount;

  const handleSave = async (status: "draft" | "sent") => {
    if (!clientName.trim()) { alert("Vyvedi ime na klient"); return; }
    if (items.some((it) => !it.description.trim())) { alert("Popylni opisaniya na redovete"); return; }
    setSaving(true);
    await createInvoice(lang, {
      invoiceNumber,
      clientName,
      clientAddress,
      clientVatNumber: clientVat,
      issueDate,
      dueDate,
      status,
      notes,
      items: items.map(({ id, ...rest }) => rest),
      subtotal: subtotal.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      total: total.toFixed(2),
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/${lang}/dashboard/accounting/invoices`}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/25 transition-all"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <FileText size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Nova faktura</h1>
                <p className="text-zinc-400 text-sm font-mono">{invoiceNumber}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 transition-colors px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              <Save size={14} /> Chernova
            </button>
            <button
              onClick={() => handleSave("sent")}
              disabled={saving}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 transition-colors px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              <Send size={14} /> Izprati
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Left — form */}
          <div className="col-span-2 space-y-5">

            {/* Invoice meta */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nomer</label>
                <input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Data na izdavane</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Srok za plashchane</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Client */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-zinc-300">Klient</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Ime / Firma *</label>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="EOOD / AD / Grazhdanin"
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">EIK / DDS nomer</label>
                  <input
                    value={clientVat}
                    onChange={(e) => setClientVat(e.target.value)}
                    placeholder="BG123456789"
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Adres</label>
                <textarea
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  rows={2}
                  placeholder="Grad, ulitsa, poshtenski kod"
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 resize-none"
                />
              </div>
            </div>

            {/* Line items */}
            <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Redove</h2>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} /> Dobavi red
                </button>
              </div>

              <div className="divide-y divide-white/5">
                <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs text-zinc-500">
                  <div className="col-span-5">Opisanie</div>
                  <div className="col-span-2 text-right">Kolichestvo</div>
                  <div className="col-span-2 text-right">Tsena EUR</div>
                  <div className="col-span-1 text-right">DDS%</div>
                  <div className="col-span-1 text-right">Suma</div>
                  <div className="col-span-1" />
                </div>

                {items.map((it) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2 px-5 py-2 items-center">
                    <div className="col-span-5">
                      <input
                        value={it.description}
                        onChange={(e) => updateItem(it.id, "description", e.target.value)}
                        placeholder="Opisanie na usluga / stoka"
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-zinc-600"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.quantity}
                        onChange={(e) => updateItem(it.id, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white text-right"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) => updateItem(it.id, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white text-right"
                      />
                    </div>
                    <div className="col-span-1">
                      <select
                        value={it.vatRate}
                        onChange={(e) => updateItem(it.id, "vatRate", parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-1 py-1 text-xs text-white"
                      >
                        <option value={0}>0%</option>
                        <option value={9}>9%</option>
                        <option value={20}>20%</option>
                      </select>
                    </div>
                    <div className="col-span-1 text-right text-xs font-mono text-zinc-300">
                      {it.total.toFixed(2)}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => removeItem(it.id)}
                        disabled={items.length === 1}
                        className="text-zinc-700 hover:text-red-400 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <label className="block text-xs text-zinc-400 mb-2">Belezhki (optsionalno)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Nachin na plashchane, bank smetka, dopylnitelna informatsiya..."
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 resize-none"
              />
            </div>
          </div>

          {/* Right — totals */}
          <div className="space-y-4">
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3 sticky top-6">
              <h2 className="text-sm font-semibold">Obshto</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Danychna osnova</span>
                  <span className="font-mono tabular-nums">{subtotal.toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>DDS</span>
                  <span className="font-mono tabular-nums">{vatAmount.toFixed(2)} EUR</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between text-white font-bold text-sm">
                  <span>Obshta suma</span>
                  <span className="font-mono tabular-nums">{total.toFixed(2)} EUR</span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => handleSave("sent")}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 transition-colors px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  <Send size={14} /> Izprati
                </button>
                <button
                  onClick={() => handleSave("draft")}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 transition-colors px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  <Save size={14} /> Zapazi kato chernova
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
