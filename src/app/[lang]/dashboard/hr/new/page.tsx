"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Mail, Briefcase, Building2, CreditCard, Save, Shield, Landmark, Calendar, FileText } from "lucide-react";
import { createEmployee } from "../actions";

export default function NewEmployeePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = React.use(params);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    position: "",
    department: "",
    salary: "",
    phone: "",
    address: "",
    personalIdentifier: "",
    bankIban: "",
    bankName: "",
    startDate: new Date().toISOString().slice(0, 10),
    contractNumber: "",
    contractKind: "permanent" as "permanent" | "fixed_term" | "civil_contract",
    contractDate: new Date().toISOString().slice(0, 10),
    contractEndDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await createEmployee(form);
    if (res.success) {
      window.location.href = `/${lang}/dashboard/hr`;
    } else {
      setError(res.error || "Грешка при добавяне на служител");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/${lang}/dashboard/hr`}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Нов служител</h1>
              <p className="text-zinc-400 text-sm">Добавяне на нов член на екипа</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/3 border border-white/8 rounded-2xl p-6 lg:p-8 space-y-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <UserPlus size={14} className="text-rose-400" /> Имена
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                placeholder="Иван Иванов"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Mail size={14} className="text-pink-400" /> Имейл
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                placeholder="ivan@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Briefcase size={14} className="text-rose-400" /> Позиция
              </label>
              <input
                type="text"
                required
                value={form.position}
                onChange={e => setForm({ ...form, position: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                placeholder="Софтуерен инженер"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Building2 size={14} className="text-pink-400" /> Отдел
              </label>
              <input
                type="text"
                required
                value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                placeholder="ИТ Отдел"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <CreditCard size={14} className="text-rose-400" /> Заплата (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.salary}
                onChange={e => setForm({ ...form, salary: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                placeholder="3000.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Телефон</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500" placeholder="+359..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-zinc-400">Адрес</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500" />
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Shield size={16} className="text-emerald-400" /> Защитени лични и банкови данни</h2>
            <p className="text-xs text-zinc-500">ЕГН и IBAN се криптират преди запис и никога не се показват в списъците.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-2 text-sm text-zinc-400">ЕГН / ЛНЧ<input value={form.personalIdentifier} onChange={e => setForm({ ...form, personalIdentifier: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" maxLength={20} /></label>
              <label className="space-y-2 text-sm text-zinc-400"><span className="flex items-center gap-2"><Landmark size={14} />IBAN</span><input value={form.bankIban} onChange={e => setForm({ ...form, bankIban: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" /></label>
              <label className="space-y-2 text-sm text-zinc-400">Банка<input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" /></label>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><FileText size={16} className="text-indigo-400" /> Трудов договор</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-2 text-sm text-zinc-400">Номер<input value={form.contractNumber} onChange={e => setForm({ ...form, contractNumber: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" placeholder="ТД-2026-001" /></label>
              <label className="space-y-2 text-sm text-zinc-400">Вид<select value={form.contractKind} onChange={e => setForm({ ...form, contractKind: e.target.value as typeof form.contractKind })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white"><option value="permanent">Безсрочен</option><option value="fixed_term">Срочен</option><option value="civil_contract">Граждански</option></select></label>
              <label className="space-y-2 text-sm text-zinc-400"><span className="flex items-center gap-2"><Calendar size={14} />Дата на договора</span><input type="date" value={form.contractDate} onChange={e => setForm({ ...form, contractDate: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" /></label>
              <label className="space-y-2 text-sm text-zinc-400">Начална дата<input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" /></label>
              <label className="space-y-2 text-sm text-zinc-400">Крайна дата<input type="date" value={form.contractEndDate} onChange={e => setForm({ ...form, contractEndDate: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" disabled={form.contractKind === 'permanent'} /></label>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 transition-all px-6 py-3 rounded-xl font-medium shadow-lg shadow-rose-500/25 disabled:opacity-50"
            >
              <Save size={18} /> {loading ? "Запазване..." : "Запази служител"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
