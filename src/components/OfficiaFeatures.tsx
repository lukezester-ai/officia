"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";

const journalEntries = [
  { id: "je-1", date: "15.01.2025", doc: "Ф-0012", desc: "Наем офис", debit: "1 200,00 лв", status: "Осчетоводено" },
  { id: "je-2", date: "16.01.2025", doc: "Ф-0988", desc: "Електроенергия", debit: "245,50 лв", status: "Осчетоводено" },
  { id: "je-3", date: "18.01.2025", doc: "БИ-021", desc: "Продажба софтуер", debit: "5 400,00 лв", status: "Осчетоводено" },
];

const vatData = [
  { name: "ДДС 20%", value: 80, color: "#7c3aed" },
  { name: "Други", value: 20, color: "#1f2937" },
];

const transactions = [
  { id: "tx-1", vendor: "ТехноМ ЕООД", amount: "-1 200,00 лв", status: "Matched", match: "Фактура #2024-047" },
  { id: "tx-2", vendor: "НетУоркс АД", amount: "-45,00 лв", status: "Review", match: null },
  { id: "tx-3", vendor: "Пейпал Люксембург", amount: "-12,00 лв", status: "Matched", match: "Абонамент Cloud" },
];

function AccountingMockup() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-xl border border-white/[0.06] bg-[#12121b] shadow-2xl">
      <div className="flex w-14 shrink-0 flex-col items-center gap-6 border-r border-white/[0.06] bg-[#0a0a12] py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-[10px] font-bold text-white">O</div>
        <LayoutDashboard className="h-4 w-4 text-purple-500" />
        <FileText className="h-4 w-4 text-zinc-600" />
        <Users className="h-4 w-4 text-zinc-600" />
        <CreditCard className="h-4 w-4 text-zinc-600" />
        <div className="mt-auto flex flex-col gap-5">
          <Settings className="h-4 w-4 text-zinc-700" />
          <HelpCircle className="h-4 w-4 text-zinc-700" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h4 className="text-[11px] font-semibold tracking-tight text-white">Журнални записи</h4>
          <div className="flex gap-1.5">
            <span className="rounded border border-white/[0.05] bg-[#1e1e2e] px-2.5 py-1 text-[9px] text-zinc-500">Януари 2025</span>
            <button className="flex items-center gap-1 rounded bg-purple-600 px-2.5 py-1 text-[9px] font-medium text-white">
              <Plus className="h-2.5 w-2.5" />
              Нов
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-hidden">
            <table className="w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th className="pb-2 pr-3 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-600">Дата</th>
                  <th className="pb-2 pr-3 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-600">Документ</th>
                  <th className="hidden pb-2 pr-3 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-600 md:table-cell">Описание</th>
                  <th className="pb-2 pr-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-600">Дебит</th>
                  <th className="pb-2 text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-600">Статус</th>
                </tr>
              </thead>
              <tbody>
                {journalEntries.map((entry, index) => (
                  <tr key={entry.id} style={{ background: index % 2 === 0 ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.04)" }}>
                    <td className="rounded-l py-2 pr-3 text-[9px] text-zinc-500">{entry.date}</td>
                    <td className="py-2 pr-3 text-[9px] font-medium text-zinc-200">{entry.doc}</td>
                    <td className="hidden py-2 pr-3 text-[9px] text-zinc-500 md:table-cell">{entry.desc}</td>
                    <td className="py-2 pr-3 text-right text-[9px] text-zinc-300">{entry.debit}</td>
                    <td className="rounded-r py-2 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-semibold text-emerald-400">
                        <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" />
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex w-28 shrink-0 flex-col gap-3">
            <div className="flex flex-col items-center rounded-xl border border-white/[0.05] bg-white/[0.04] p-3">
              <span className="mb-2 font-mono text-[8px] uppercase tracking-[0.1em] text-zinc-500">ДДС разбивка</span>
              <div className="relative h-20 w-20">
                <PieChart width={80} height={80}>
                    <Pie data={vatData} innerRadius={26} outerRadius={36} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {vatData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[9px] font-bold text-white">20%</span>
                  <span className="text-[7px] uppercase tracking-wide text-zinc-500">ДДС</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-600/10 p-3">
              <span className="mb-1 block font-mono text-[8px] uppercase tracking-[0.08em] text-purple-400">За внасяне</span>
              <span className="text-[11px] font-bold text-white">842,15 лв</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIDocumentsMockup() {
  const fields = [
    { label: "Доставчик", value: "ТехноМ ЕООД", highlight: false, confirmed: true },
    { label: "Сума (бруто)", value: "1 200,00 лв", highlight: true, confirmed: false },
    { label: "ДДС (20%)", value: "240,00 лв", highlight: false, confirmed: true },
    { label: "Дата", value: "15.01.2025", highlight: false, confirmed: true },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#12121b] shadow-2xl">
      <div className="flex h-9 shrink-0 items-center border-b border-white/[0.06] bg-[#0a0a12] px-4">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full border border-red-500/50 bg-red-500/30" />
          <div className="h-2.5 w-2.5 rounded-full border border-amber-500/50 bg-amber-500/30" />
          <div className="h-2.5 w-2.5 rounded-full border border-emerald-500/50 bg-emerald-500/30" />
        </div>
        <div className="ml-4 flex h-5 w-36 items-center gap-1.5 rounded bg-zinc-800/80 px-2 text-[9px] text-zinc-500">
          <Search className="h-2.5 w-2.5" />
          invoice_scan_04.pdf
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-lg border border-white/[0.05] bg-[#0e0e18] p-5">
          <div className="mb-8 flex items-start justify-between">
            <div className="h-10 w-10 rounded-lg border border-white/[0.08] bg-white/[0.04]" />
            <div className="space-y-1.5">
              <div className="h-1.5 w-20 rounded bg-zinc-800" />
              <div className="ml-auto h-1.5 w-14 rounded bg-zinc-800" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-2 w-3/4 rounded bg-zinc-800/60" />
            <div className="h-2 w-1/2 rounded bg-zinc-800/60" />
            <div className="h-2 w-2/3 rounded border border-purple-500/30 bg-purple-500/25" />
            <div className="mt-6 h-10 w-full rounded bg-zinc-800/20" />
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.25, 0.55, 0.25] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-28 w-28 items-center justify-center rounded-full border border-purple-500/40 bg-purple-500/5 shadow-[0_0_32px_8px_rgba(124,58,237,0.12)]"
            >
              <Bot className="h-7 w-7 text-purple-500" />
            </motion.div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2.5 lg:w-60">
          {fields.map((field) => (
            <div
              key={field.label}
              className="space-y-1 rounded-lg border p-3"
              style={{
                background: field.highlight ? "rgba(124,58,237,0.07)" : "rgba(255,255,255,0.03)",
                borderColor: field.highlight ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.05)",
              }}
            >
              <span className="block font-mono text-[8px] uppercase tracking-[0.1em]" style={{ color: field.highlight ? "#a78bfa" : "#71717a" }}>{field.label}</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-white">{field.value}</span>
                {field.confirmed ? <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" /> : <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.4, repeat: Infinity }} className="h-3.5 w-1.5 rounded-sm bg-purple-500" />}
              </div>
            </div>
          ))}

          <div className="mt-1 rounded-xl bg-purple-600 p-3 shadow-[0_4px_24px_rgba(124,58,237,0.35)]">
            <div className="flex items-start gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/20">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <p className="text-[10px] leading-relaxed text-white/90">Искаш ли да осчетоводя тази фактура към сметка 601 (Материали)?</p>
            </div>
            <div className="mt-2.5 flex gap-2">
              <button className="flex-1 rounded-lg bg-white py-1.5 text-[10px] font-bold text-purple-700">ДА</button>
              <button className="flex-1 rounded-lg bg-white/20 py-1.5 text-[10px] text-white">НЕ</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BankSyncMockup() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#12121b] shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0a0a12] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-amber-600">
            <span className="text-[9px] font-bold text-white">UnK</span>
          </div>
          <div>
            <h5 className="text-[11px] font-semibold text-white">УниКредит Булбанк</h5>
            <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Свързано чрез PSD2
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="mb-0.5 block text-[8px] uppercase tracking-[0.08em] text-zinc-600">Баланс</span>
          <span className="text-[13px] font-bold tabular-nums text-white">24 560,82 лв</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-zinc-500">AI автоматично съпоставяне</span>
            <span className="text-[11px] font-bold tabular-nums text-purple-400">87%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80">
            <motion.div initial={{ width: 0 }} whileInView={{ width: "87%" }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-indigo-500" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
          {transactions.map((tx, index) => (
            <div key={tx.id} className="flex items-center justify-between rounded-xl border border-white/[0.05] p-3" style={{ background: index % 2 === 0 ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80">
                  <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold leading-tight text-white">{tx.vendor}</span>
                  <span className="text-[8px] text-zinc-600">18 Януари 2025</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-[10px] font-bold tabular-nums text-white">{tx.amount}</span>
                {tx.status === "Matched" ? (
                  <div className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-medium text-emerald-400">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {tx.match}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-medium text-amber-400">
                    <Clock className="h-2.5 w-2.5" />
                    Чака преглед
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex shrink-0 gap-2">
          <button className="flex-1 rounded-lg border border-white/[0.07] bg-zinc-800/40 py-2 text-[9px] font-medium text-white transition-colors hover:bg-zinc-800/60">Всички транзакции</button>
          <button className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-purple-600 py-2 text-[9px] font-bold text-white transition-colors hover:bg-purple-500">
            <Zap className="h-3 w-3 fill-white" />
            Синхронизирай
          </button>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardData {
  id: string;
  tag: string;
  title: string;
  description: string;
  mockup: React.ReactNode;
  tags: string[];
  delay: number;
}

function FeatureCard({ data }: { data: FeatureCardData }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.75, delay: data.delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col overflow-hidden rounded-[1.75rem]"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: hovered ? "1px solid rgba(124,58,237,0.35)" : "1px solid rgba(255,255,255,0.06)",
        boxShadow: hovered ? "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.15) inset" : "0 8px 32px rgba(0,0,0,0.45)",
        transition: "box-shadow 200ms ease-out, border-color 200ms ease-out",
      }}
    >
      <div className="p-8 pb-5">
        <span className="mb-4 block font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-purple-400">{data.tag}</span>
        <h3 className="mb-3 text-xl font-bold leading-tight tracking-tight text-white">{data.title}</h3>
        <p className="mb-5 text-sm leading-relaxed text-zinc-400">{data.description}</p>
        <div className="flex flex-wrap gap-2">
          {data.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-[#2a2a45] bg-[#1e1e32] px-3 py-1 font-mono text-[11px] font-semibold tracking-[0.06em] text-[#a1a1c4]">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden px-5 pb-5">
        <div className="h-full w-full overflow-hidden rounded-2xl transition-transform duration-300 ease-out" style={{ transform: hovered ? "scale(1.015)" : "scale(1)" }}>
          {data.mockup}
        </div>
        <div className="absolute bottom-4 right-4 transition-opacity duration-200 ease-out" style={{ opacity: hovered ? 1 : 0 }}>
          <div className="rounded-full border border-white/20 bg-white/10 p-2 backdrop-blur-md transition-transform duration-200 ease-out" style={{ transform: hovered ? "translateX(3px)" : "translateX(0)" }}>
            <ArrowRight className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function PayrollMockup() {
  const employees = [
    { name: "Иван Петров", gross: 2400.00, insurance: 366.00, tax: 203.40 },
    { name: "Мария Георгиева", gross: 3200.00, insurance: 488.16, tax: 271.18 },
    { name: "Георги Димитров", gross: 1800.00, insurance: 274.68, tax: 152.53 },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#12121b] shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0a0a12] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-orange-600">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <div>
            <h5 className="text-[11px] font-semibold text-white">Обр. 1 и Обр. 6</h5>
            <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              XML за НАП
            </span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <span className="rounded bg-amber-600/20 px-2 py-1 text-[8px] font-semibold text-amber-400">Обр.1</span>
          <span className="rounded bg-orange-600/20 px-2 py-1 text-[8px] font-semibold text-orange-400">Обр.6</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Служители</span>
          <span className="rounded-full bg-purple-600/20 px-2 py-0.5 text-[8px] font-semibold text-purple-400">3 назначени</span>
        </div>

        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th className="pb-1.5 pr-2 text-[8px] font-semibold uppercase tracking-[0.08em] text-zinc-600">Име</th>
              <th className="pb-1.5 pr-2 text-right text-[8px] font-semibold uppercase tracking-[0.08em] text-zinc-600">Бруто</th>
              <th className="pb-1.5 pr-2 text-right text-[8px] font-semibold uppercase tracking-[0.08em] text-zinc-600">Осиг.</th>
              <th className="pb-1.5 text-right text-[8px] font-semibold uppercase tracking-[0.08em] text-zinc-600">Данък</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, i) => (
              <tr key={emp.name} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.04)" }}>
                <td className="py-1.5 pr-2 text-[9px] text-zinc-200">{emp.name}</td>
                <td className="py-1.5 pr-2 text-right text-[9px] text-zinc-300">{emp.gross.toFixed(2)}</td>
                <td className="py-1.5 pr-2 text-right text-[9px] text-zinc-300">{emp.insurance.toFixed(2)}</td>
                <td className="py-1.5 text-right text-[9px] text-zinc-300">{emp.tax.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.03] p-2 text-center">
            <span className="block text-[9px] font-bold text-white">7 400.00</span>
            <span className="text-[7px] uppercase tracking-[0.08em] text-zinc-500">Общо бруто</span>
          </div>
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.03] p-2 text-center">
            <span className="block text-[9px] font-bold text-white">1 128.84</span>
            <span className="text-[7px] uppercase tracking-[0.08em] text-zinc-500">Осигуровки</span>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-center">
            <span className="block text-[9px] font-bold text-amber-400">627.11</span>
            <span className="text-[7px] uppercase tracking-[0.08em] text-amber-500">Данък</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-600/30 bg-amber-600/10 py-1.5 text-[8px] font-bold text-amber-400">
            <Download className="h-2.5 w-2.5" />
            Обр.1 XML
          </button>
          <button className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-orange-600/30 bg-orange-600/10 py-1.5 text-[8px] font-bold text-orange-400">
            <Download className="h-2.5 w-2.5" />
            Обр.6 XML
          </button>
        </div>
      </div>
    </div>
  );
}

function HRMockup() {
  const employees = [
    { name: "Иван Петров", balance: 12, role: "Разработчик" },
    { name: "Мария Георгиева", balance: 8, role: "Маркетинг" },
    { name: "Георги Димитров", balance: 15, role: "Дизайнер" },
  ];

  const pending = [
    { employee: "Иван Петров", type: "Платен отпуск", days: 3, from: "22.07.2025", to: "24.07.2025" },
    { employee: "Мария Георгиева", type: "Болничен", days: 2, from: "18.07.2025", to: "19.07.2025" },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#12121b] shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0a0a12] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <h5 className="text-[11px] font-semibold text-white">Управление на персонала</h5>
            <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Отпуски и заявки
            </span>
          </div>
        </div>
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
          <span className="text-[8px] font-bold text-amber-400">2</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Служители</span>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-teal-600/30 bg-teal-600/10 px-2 py-0.5 text-[8px] font-medium text-teal-400">3 активни</span>
          </div>
        </div>

        <div className="mb-3 space-y-1.5">
          {employees.map((emp) => (
            <div key={emp.name} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-medium text-zinc-200">{emp.name}</span>
                <span className="text-[7px] text-zinc-500">{emp.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-600/15 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-400">{emp.balance} дни</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-3 w-3 text-amber-400" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-400">Чакащи заявки</span>
        </div>

        <div className="space-y-1.5">
          {pending.map((req) => (
            <div key={`${req.employee}-${req.type}`} className="flex items-center justify-between rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2">
              <div>
                <span className="block text-[9px] font-medium text-zinc-200">{req.employee}</span>
                <span className="text-[7px] text-zinc-500">{req.type} · {req.from} – {req.to} ({req.days} дни)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600/20 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                </span>
                <span className="flex h-5 w-5 items-center justify-center rounded bg-red-600/20 text-red-400">
                  <span className="text-[10px] font-bold">✕</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-dashed border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <span className="text-[8px] text-zinc-500 flex items-center justify-center gap-1">
            <Plus className="h-2.5 w-2.5" />
            Нова заявка за отпуск
          </span>
        </div>
      </div>
    </div>
  );
}

const featureCards: FeatureCardData[] = [
  {
    id: "accounting",
    tag: "Счетоводство",
    title: "Пълен сметкоплан и автоматично ДДС",
    description: "Журнални записи, ДДС дневници, баланс и отчет за приходи/загуби — всичко автоматизирано.",
    mockup: <AccountingMockup />,
    tags: ["ЗДДС", "ДДС дневници", "НАП export"],
    delay: 0.1,
  },
  {
    id: "ai-docs",
    tag: "AI асистент",
    title: "Качи документ — AI извлича всичко",
    description: "PDF или снимка на фактура → Claude AI разпознава доставчик, сума, ДДС, дата и предлага осчетоводяване.",
    mockup: <AIDocumentsMockup />,
    tags: ["Claude AI", "OCR", "Auto-осчетоводяване"],
    delay: 0.2,
  },
  {
    id: "bank-sync",
    tag: "Банкиране",
    title: "Банкова демонстрация и интелигентно съпоставяне",
    description: "Демо транзакции за тестване на reconciliation. Реален PSD2 конектор — в разработка.",
    mockup: <BankSyncMockup />,
    tags: ["Demo", "Auto-match", "Roadmap: PSD2"],
    delay: 0.3,
  },
  {
    id: "payroll-tax",
    tag: "ТРЗ и Данъци",
    title: "Автоматични декларации Обр.1 и Обр.6",
    description: "Изчисляване на ТРЗ, осигуровки и данък общ доход. XML export за НАП — Обр.1 и Обр.6 готови.",
    mockup: <PayrollMockup />,
    tags: ["Обр.1", "Обр.6", "XML export"],
    delay: 0.4,
  },
  {
    id: "hr",
    tag: "Човешки ресурси",
    title: "Управление на отпуски и заявки",
    description: "Платен, болничен, неплатен отпуск — заявки, одобрение, баланс и история за всеки служител.",
    mockup: <HRMockup />,
    tags: ["Отпуски", "Заявки", "Персонал"],
    delay: 0.5,
  },
];

export default function OfficiaFeatures({ lang }: { lang: string }) {
  const authRedirect = encodeURIComponent(`/${lang}/dashboard`);
  const signUpHref = `/sign-up?redirect_url=${authRedirect}`;

  return (
    <section id="features" className="overflow-hidden bg-[#09090f] px-4 py-24 selection:bg-purple-500 selection:text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400"
          >
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500" />
            Всичко-в-едно платформа
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-5 font-bold leading-tight tracking-tight text-white"
            style={{ fontSize: "clamp(2.5rem, 6vw, 3.75rem)" }}
          >
            Всичко на едно място
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto max-w-2xl text-[17px] leading-relaxed text-zinc-400"
          >
            Officia замества 5 различни програми — <span className="font-medium text-white">счетоводство</span>,{" "}
            <span className="font-medium text-white">фактуриране</span>, <span className="font-medium text-white">HR</span>,{" "}
            <span className="font-medium text-white">банкиране</span> и <span className="font-medium text-white">документи</span>.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-4 lg:[grid-auto-rows:680px]">
          {featureCards.map((card) => (
            <FeatureCard key={card.id} data={card} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mt-24 overflow-hidden rounded-[2.5rem] border border-white/[0.06] bg-[linear-gradient(135deg,rgba(124,58,237,0.12)_0%,rgba(22,22,31,0.95)_50%,#09090f_100%)] px-6 py-12 md:px-14 md:py-16"
        >
          <div className="pointer-events-none absolute -right-[5%] -top-[20%] h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[100px]" />
          <div className="relative flex flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">
            <div>
              <h3 className="mb-3 text-2xl font-bold tracking-tight text-white md:text-4xl">Готови ли сте за бъдещето?</h3>
              <p className="max-w-lg text-sm leading-relaxed text-zinc-500 md:text-base">
                Присъединете се към стотици български компании, които вече оптимизират своето счетоводство с Officia.
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
              <CTAButton href={signUpHref} variant="primary" label="Започни безплатно" />
              <CTAButton href="/bg/dashboard" variant="secondary" label="Демонстрация" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CTAButton({ href, variant, label }: { href: string; variant: "primary" | "secondary"; label: string }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-7 py-3.5 text-sm font-bold text-white transition-colors"
      style={{
        background: variant === "primary" ? (hovered ? "#8b5cf6" : "#7c3aed") : hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
        border: variant === "secondary" ? "1px solid rgba(255,255,255,0.1)" : "none",
        boxShadow: variant === "primary" ? "0 8px 28px rgba(124,58,237,0.3)" : "none",
      }}
    >
      {label}
      <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out" style={{ transform: hovered ? "translateX(3px)" : "translateX(0)" }} />
    </Link>
  );
}
