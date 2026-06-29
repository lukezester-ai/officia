"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Search,
  FileText,
  Users,
  Building2,
  Receipt,
  BarChart2,
  Landmark,
  Settings,
  ShoppingCart,
  X,
  Bot,
  CheckSquare,
  Package,
  Loader2,
} from "lucide-react";
import { searchEntities, type EntitySearchResult } from "@/lib/search/entity-search";

type IconType = React.ComponentType<{ size?: number; className?: string }>;

type SearchItem = {
  key: string;
  label: string;
  subtitle: string;
  href: string;
  group: string;
  Icon: IconType;
};

type SearchLabels = {
  title: string;
  subtitle: string;
  placeholder: string;
  hintEmpty: string;
  hintOneChar: string;
  searching: string;
  noResults: string;
  navHint: string;
  openHint: string;
  closeHint: string;
  groups: {
    sections: string;
    actions: string;
    navigation: string;
    quickAction: string;
    invoices: string;
    counterparties: string;
    employees: string;
    documents: string;
  };
  pages: {
    home: string;
    accounting: string;
    invoices: string;
    newInvoice: string;
    purchases: string;
    documents: string;
    counterparties: string;
    banking: string;
    hr: string;
    inventory: string;
    vatJournal: string;
    taxes: string;
    aiTasks: string;
    aiAssistant: string;
    reports: string;
    settings: string;
    newEmployee: string;
    newJournalEntry: string;
  };
};

type HeaderLabels = {
  searchPlaceholder: string;
  searchAria: string;
  searchTitle: string;
};

type SearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  labels: { search: SearchLabels; header: HeaderLabels };
};

const SearchContext = createContext<SearchContextValue | null>(null);

function useSearchContext() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("SearchTrigger/GlobalSearch must be used within SearchProvider");
  }
  return ctx;
}

const ENTITY_ICONS: Record<EntitySearchResult["kind"], IconType> = {
  invoice: Receipt,
  counterparty: Building2,
  employee: Users,
  document: FileText,
};

function buildPages(labels: SearchLabels): Omit<SearchItem, "key">[] {
  const { pages: p, groups: g } = labels;
  return [
    { label: p.home, href: "/dashboard", Icon: BarChart2, group: g.sections, subtitle: g.navigation },
    { label: p.accounting, href: "/dashboard/accounting", Icon: BarChart2, group: g.sections, subtitle: g.navigation },
    { label: p.invoices, href: "/dashboard/invoices", Icon: Receipt, group: g.sections, subtitle: g.navigation },
    { label: p.newInvoice, href: "/dashboard/invoices?new=1", Icon: Receipt, group: g.actions, subtitle: g.quickAction },
    { label: p.purchases, href: "/dashboard/purchase-invoices", Icon: ShoppingCart, group: g.sections, subtitle: g.navigation },
    { label: p.documents, href: "/dashboard/documents", Icon: FileText, group: g.sections, subtitle: g.navigation },
    { label: p.counterparties, href: "/dashboard/counterparties", Icon: Building2, group: g.sections, subtitle: g.navigation },
    { label: p.banking, href: "/dashboard/banking", Icon: Landmark, group: g.sections, subtitle: g.navigation },
    { label: p.hr, href: "/dashboard/hr", Icon: Users, group: g.sections, subtitle: g.navigation },
    { label: p.inventory, href: "/dashboard/inventory", Icon: Package, group: g.sections, subtitle: g.navigation },
    { label: p.vatJournal, href: "/dashboard/vat-journals", Icon: FileText, group: g.sections, subtitle: g.navigation },
    { label: p.taxes, href: "/dashboard/taxes", Icon: FileText, group: g.sections, subtitle: g.navigation },
    { label: p.aiTasks, href: "/dashboard/tasks", Icon: CheckSquare, group: g.sections, subtitle: g.navigation },
    { label: p.aiAssistant, href: "/dashboard/ai-assistant", Icon: Bot, group: g.sections, subtitle: g.navigation },
    { label: p.reports, href: "/dashboard/accounting/reports", Icon: BarChart2, group: g.sections, subtitle: g.navigation },
    { label: p.settings, href: "/dashboard/settings", Icon: Settings, group: g.sections, subtitle: g.navigation },
    { label: p.newEmployee, href: "/dashboard/hr/new", Icon: Users, group: g.actions, subtitle: g.quickAction },
    { label: p.newJournalEntry, href: "/dashboard/accounting/journal/new", Icon: FileText, group: g.actions, subtitle: g.quickAction },
  ];
}

function entityToSearchItem(entity: EntitySearchResult, groups: SearchLabels["groups"]): SearchItem {
  const groupMap: Record<EntitySearchResult["kind"], string> = {
    invoice: groups.invoices,
    counterparty: groups.counterparties,
    employee: groups.employees,
    document: groups.documents,
  };

  return {
    key: entity.id,
    label: entity.label,
    subtitle: entity.subtitle,
    href: entity.href,
    group: groupMap[entity.kind],
    Icon: ENTITY_ICONS[entity.kind],
  };
}

function pageToSearchItem(page: Omit<SearchItem, "key">, index: number): SearchItem {
  return { key: `page-${page.href}-${index}`, ...page };
}

export function SearchProvider({
  children,
  labels,
}: {
  children: React.ReactNode;
  labels: { search: SearchLabels; header: HeaderLabels };
}) {
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
    <SearchContext.Provider value={{ open, setOpen, labels }}>{children}</SearchContext.Provider>
  );
}

export function GlobalSearch() {
  const { open, setOpen, labels } = useSearchContext();
  const { search: t } = labels;
  const pages = useMemo(() => buildPages(t), [t]);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [entityResults, setEntityResults] = useState<SearchItem[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const params = useParams();
  const lang = (params.lang as string) || "bg";

  const trimmedQuery = query.trim();
  const pageResults = trimmedQuery
    ? pages.filter((page) => {
        const haystack = `${page.label} ${page.subtitle} ${page.group}`.toLowerCase();
        return haystack.includes(trimmedQuery.toLowerCase());
      }).map(pageToSearchItem)
    : pages.slice(0, 8).map(pageToSearchItem);

  const results = trimmedQuery.length >= 2 ? [...entityResults, ...pageResults] : pageResults;

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setQuery("");
      setSel(0);
      setEntityResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setEntityResults([]);
      setEntityLoading(false);
      return;
    }

    let cancelled = false;
    setEntityLoading(true);

    const timer = setTimeout(async () => {
      try {
        const entities = await searchEntities(trimmedQuery);
        if (!cancelled) {
          setEntityResults(entities.map((entity) => entityToSearchItem(entity, t.groups)));
        }
      } catch {
        if (!cancelled) {
          setEntityResults([]);
        }
      } finally {
        if (!cancelled) {
          setEntityLoading(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery, t.groups]);

  useEffect(() => {
    setSel(0);
  }, [results.length, trimmedQuery]);

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
      setSel((value) => Math.min(value + 1, results.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSel((value) => Math.max(value - 1, 0));
    }
    if (event.key === "Enter" && results[sel]) {
      go(results[sel].href);
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
          <p className="text-sm font-semibold text-white">{t.title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3.5">
          <Search size={17} className="shrink-0 text-zinc-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKey}
            placeholder={t.placeholder}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
          />
          {entityLoading && <Loader2 size={15} className="shrink-0 animate-spin text-zinc-500" />}
          <kbd className="hidden items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-600 sm:flex">
            Esc
          </kbd>
          <button type="button" onClick={() => setOpen(false)} className="ml-1 text-zinc-500 hover:text-white">
            <X size={15} />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          {!trimmedQuery && (
            <div className="px-4 py-2 text-xs text-zinc-500">{t.hintEmpty}</div>
          )}
          {trimmedQuery.length === 1 && (
            <div className="px-4 py-2 text-xs text-zinc-500">{t.hintOneChar}</div>
          )}
          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500">
              {entityLoading ? t.searching : `${t.noResults} „${query}"`}
            </div>
          ) : (
            results.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => go(item.href)}
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
                  <item.Icon size={15} className={index === sel ? "text-indigo-400" : "text-zinc-400"} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{item.label}</div>
                  <div className="truncate text-[11px] text-zinc-500">
                    {item.group} · {item.subtitle}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="flex gap-4 border-t border-white/8 px-4 py-2 text-[11px] text-zinc-600">
          <span>{t.navHint}</span>
          <span>{t.openHint}</span>
          <span>{t.closeHint}</span>
          <span className="ml-auto">Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}

export function SearchTrigger() {
  const { setOpen, labels } = useSearchContext();
  const { header: h } = labels;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={h.searchAria}
      title={h.searchTitle}
      className="flex w-full max-w-md items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-sm text-zinc-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white lg:max-w-lg"
    >
      <Search size={14} className="shrink-0" />
      <span className="flex-1 truncate text-left text-xs sm:text-sm">{h.searchPlaceholder}</span>
      <kbd className="hidden shrink-0 rounded border border-white/10 px-1 py-0.5 text-[10px] sm:inline">Ctrl K</kbd>
    </button>
  );
}
