"use client";
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, FileText, Users, Building2, Receipt, BarChart2, Landmark, Settings, ShoppingCart, X, Bot, Inbox, CheckSquare } from "lucide-react";

type Page = { label: string; href: string; Icon: React.ComponentType<{ size?: number; className?: string }>; group: string };

const PAGES: Page[] = [
  { label: "Главно табло", href: "/dashboard", Icon: BarChart2, group: "Навигация" },
  { label: "Счетоводство", href: "/dashboard/accounting", Icon: BarChart2, group: "Навигация" },
  { label: "Фактури", href: "/dashboard/invoices", Icon: Receipt, group: "Навигация" },
  { label: "Нова фактура", href: "/dashboard/accounting/invoices/new", Icon: Receipt, group: "Бързи действия" },
  { label: "Покупки", href: "/dashboard/purchase-invoices", Icon: ShoppingCart, group: "Навигация" },
  { label: "Документи", href: "/dashboard/documents", Icon: FileText, group: "Навигация" },
  { label: "Контрагенти", href: "/dashboard/counterparties", Icon: Building2, group: "Навигация" },
  { label: "Банкиране", href: "/dashboard/banking", Icon: Landmark, group: "Навигация" },
  { label: "Кадри (HR)", href: "/dashboard/hr", Icon: Users, group: "Навигация" },
  { label: "AI Задачи", href: "/dashboard/tasks", Icon: CheckSquare, group: "Навигация" },
  { label: "AI Асистент", href: "/dashboard/ai-assistant", Icon: Bot, group: "Навигация" },
  { label: "Отчети", href: "/dashboard/accounting/reports", Icon: BarChart2, group: "Навигация" },
  { label: "ДДС журнал", href: "/dashboard/vat-journals", Icon: FileText, group: "Навигация" },
  { label: "Настройки", href: "/dashboard/settings", Icon: Settings, group: "Навигация" },
  { label: "Нов служител", href: "/dashboard/hr/new", Icon: Users, group: "Бързи действия" },
  { label: "Нов журнален запис", href: "/dashboard/accounting/journal/new", Icon: FileText, group: "Бързи действия" },
];

type SearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

function useSearchContext() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("SearchTrigger/GlobalSearch must be used within SearchProvider");
  }
  return ctx;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <SearchContext.Provider value={{ open, setOpen }}>
      {children}
    </SearchContext.Provider>
  );
}

export function GlobalSearch() {
  const { open, setOpen } = useSearchContext();
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const params = useParams();
  const lang = (params.lang as string) || "bg";

  const filtered = query.trim()
    ? PAGES.filter((page) => page.label.toLowerCase().includes(query.toLowerCase()))
    : PAGES.slice(0, 10);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setQuery("");
      setSel(0);
    }
  }, [open]);

  const go = useCallback(
    (href: string) => {
      router.push(`/${lang}${href}`);
      setOpen(false);
    },
    [lang, router, setOpen],
  );

  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSel((value) => Math.min(value + 1, filtered.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSel((value) => Math.max(value - 1, 0));
    }
    if (event.key === "Enter" && filtered[sel]) {
      go(filtered[sel].href);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[14vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/8 px-4 py-3">
          <p className="text-sm font-semibold text-white">Бърза навигация</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Търси раздел или действие — фактури, HR, банка, документи, настройки…
          </p>
        </div>
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3.5">
          <Search size={17} className="shrink-0 text-zinc-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSel(0);
            }}
            onKeyDown={onKey}
            placeholder="Напиши име на раздел, напр. „фактури“ или „отчети“"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
          />
          <kbd className="hidden items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-600 sm:flex">
            Esc
          </kbd>
          <button type="button" onClick={() => setOpen(false)} className="ml-1 text-zinc-500 hover:text-white">
            <X size={15} />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          {!query.trim() && (
            <div className="px-4 py-2 text-xs text-zinc-500">
              Показани са най-често използваните раздели. Започни да пишеш, за да филтрираш.
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500">Няма резултати за „{query}"</div>
          ) : (
            filtered.map((page, index) => (
              <button
                key={page.href}
                type="button"
                onClick={() => go(page.href)}
                onMouseEnter={() => setSel(index)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === sel ? "bg-white/8 text-white" : "text-zinc-300 hover:bg-white/5"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    index === sel ? "bg-indigo-600/30" : "bg-white/5"
                  }`}
                >
                  <page.Icon size={15} className={index === sel ? "text-indigo-400" : "text-zinc-400"} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{page.label}</div>
                  <div className="text-[11px] text-zinc-500">{page.group}</div>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="flex gap-4 border-t border-white/8 px-4 py-2 text-[11px] text-zinc-600">
          <span>↑↓ навигация</span>
          <span>↵ отвори</span>
          <span>Esc затвори</span>
          <span className="ml-auto">Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}

export function SearchTrigger() {
  const { setOpen } = useSearchContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Бърза навигация — намери страница или действие"
      title="Бърза навигация между раздели (Ctrl+K)"
      className="flex w-full max-w-md items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-sm text-zinc-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
    >
      <Search size={14} className="shrink-0" />
      <span className="flex-1 truncate text-left text-xs sm:text-sm">
        Намери раздел — фактури, HR, документи…
      </span>
      <kbd className="hidden shrink-0 rounded border border-white/10 px-1 py-0.5 text-[10px] sm:inline">Ctrl K</kbd>
    </button>
  );
}
