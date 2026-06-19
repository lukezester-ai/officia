// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, FileText, Users, Building2, Receipt, BarChart2, Landmark, Settings, ShoppingCart, X } from "lucide-react";

type Page = { label: string; href: string; Icon: any; group: string };

const PAGES: Page[] = [
  { label: "Главно табло",    href: "/dashboard",                    Icon: BarChart2,    group: "Навигация" },
  { label: "Фактури",         href: "/dashboard/invoices",           Icon: Receipt,      group: "Навигация" },
  { label: "Покупки",         href: "/dashboard/purchase-invoices",  Icon: ShoppingCart, group: "Навигация" },
  { label: "Документи",       href: "/dashboard/documents",          Icon: FileText,     group: "Навигация" },
  { label: "Контрагенти",     href: "/dashboard/counterparties",     Icon: Building2,    group: "Навигация" },
  { label: "Банкиране",       href: "/dashboard/banking",            Icon: Landmark,     group: "Навигация" },
  { label: "Счетоводство",    href: "/dashboard/accounting",         Icon: BarChart2,    group: "Навигация" },
  { label: "ЧА",              href: "/dashboard/hr",                 Icon: Users,        group: "Навигация" },
  { label: "Отчети",          href: "/dashboard/reports",            Icon: BarChart2,    group: "Навигация" },
  { label: "ДДС журнал",      href: "/dashboard/vat-journals",       Icon: FileText,     group: "Навигация" },
  { label: "Настройки",       href: "/dashboard/settings",           Icon: Settings,     group: "Навигация" },
  { label: "Нова фактура",    href: "/dashboard/invoices/new",       Icon: Receipt,      group: "Бързи действия" },
  { label: "Нов документ",    href: "/dashboard/documents/new",      Icon: FileText,     group: "Бързи действия" },
  { label: "Нов контрагент",  href: "/dashboard/counterparties/new", Icon: Building2,    group: "Бързи действия" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const params = useParams();
  const lang = (params.lang as string) || "bg";

  const filtered = query.trim()
    ? PAGES.filter(p => p.label.toLowerCase().includes(query.toLowerCase()))
    : PAGES.slice(0, 9);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setOpen(o => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 30); setQuery(""); setSel(0); }
  }, [open]);

  const go = (href: string) => { router.push(`/${lang}${href}`); setOpen(false); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && filtered[sel]) go(filtered[sel].href);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[14vh] px-4" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <Search size={17} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSel(0); }}
            onKeyDown={onKey}
            placeholder="Търсене на страница или действие..."
            className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-sm"
          />
          <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-zinc-600 border border-white/10 rounded px-1.5 py-0.5">Esc</kbd>
          <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white ml-1"><X size={15} /></button>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">Няма резултати за „{query}"</div>
          ) : filtered.map((p, i) => (
            <button key={p.href} onClick={() => go(p.href)} onMouseEnter={() => setSel(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === sel ? "bg-white/8 text-white" : "text-zinc-300 hover:bg-white/5"}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${i === sel ? "bg-indigo-600/30" : "bg-white/5"}`}>
                <p.Icon size={15} className={i === sel ? "text-indigo-400" : "text-zinc-400"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-[11px] text-zinc-500">{p.group}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-white/8 flex gap-4 text-[11px] text-zinc-600">
          <span>↑↓ navigation</span><span>↵ otvori</span><span>Esc zmtvori</span>
          <span className="ml-auto">Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}

export function SearchTrigger() {
  return (
    <button
      onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))}
      className="flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 rounded-xl px-3 py-2 text-sm text-zinc-400 hover:text-white transition-all w-48 lg:w-64"
    >
      <Search size={14} />
      <span className="flex-1 text-left text-xs">Търсене...</span>
      <kbd className="text-[10px] border border-white/10 rounded px-1 py-0.5">Ctrl K</kbd>
    </button>
  );
}
