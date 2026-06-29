"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Mail, Briefcase, Building2, CreditCard, Save } from "lucide-react";
import { createEmployee } from "../actions";

export default function NewEmployeePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = React.use(params);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    position: "",
    department: "",
    salary: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createEmployee(form);
    if (res.success) {
      window.location.href = `/${lang}/dashboard/hr`;
    } else {
      alert("Грешка при добавяне на служител");
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
                required
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
          </div>

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
