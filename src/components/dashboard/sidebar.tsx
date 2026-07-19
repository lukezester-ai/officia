'use client';
// @ts-nocheck
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Briefcase, Bot, Settings, Landmark, Sparkles, BarChart3, Receipt, Building2, UsersRound, FilePlus, ShoppingCart, CheckSquare, Menu, X } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';

function buildNavItems(dict: any, lang: string) {
  return [
    { name: dict.dashboard, href: `/${lang}/dashboard`, icon: LayoutDashboard },
    { name: dict.accounting, href: `/${lang}/dashboard/accounting`, icon: FileText },
    { name: dict.hr, href: `/${lang}/dashboard/hr`, icon: Users },
    { name: dict.payroll, href: `/${lang}/dashboard/payroll`, icon: Receipt },
    { name: dict.banking, href: `/${lang}/dashboard/banking`, icon: Landmark },
    { name: dict.documents, href: `/${lang}/dashboard/documents`, icon: Briefcase },
    { name: dict.aiTasks, href: `/${lang}/dashboard/tasks`, icon: CheckSquare },
    { name: dict.reports, href: `/${lang}/dashboard/accounting/reports`, icon: BarChart3 },
    { name: dict.vatJournals, href: `/${lang}/dashboard/vat-journals`, icon: Receipt },
    { name: dict.inventory, href: `/${lang}/dashboard/inventory`, icon: ShoppingCart },
    { name: dict.fixedAssets, href: `/${lang}/dashboard/fixed-assets`, icon: Building2 },
    { name: dict.counterparties, href: `/${lang}/dashboard/counterparties`, icon: UsersRound },
    { name: dict.invoices, href: `/${lang}/dashboard/invoices`, icon: FilePlus },
    { name: dict.purchaseInvoices, href: `/${lang}/dashboard/purchase-invoices`, icon: ShoppingCart },
    { name: dict.taxes, href: `/${lang}/dashboard/taxes`, icon: FileText },
    { name: dict.aiAssistant, href: `/${lang}/dashboard/ai-assistant`, icon: Bot },
    { name: dict.settings, href: `/${lang}/dashboard/settings`, icon: Settings },
  ];
}

export function Sidebar({ dict, lang }: { dict: any; lang: string }) {
  const pathname = usePathname();
  const navItems = buildNavItems(dict, lang);
  return (
    <aside className="fixed start-0 top-0 z-50 hidden h-screen w-64 flex-col border-e border-white/5 bg-[#0A0F1C] md:flex">
      <Link href={`/${lang}`} className="flex items-center gap-2.5 px-5 py-5 transition-opacity hover:opacity-80">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#F59E0B]">
          <Sparkles size={16} className="text-[#0B1220]" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">Officia MENA</span>
      </Link>

      <div className="mx-4 mb-4 h-px bg-white/10" />
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {navItems.map((item) => {
          const isDashboardHome = item.href === `/${lang}/dashboard`;
          const isActive = isDashboardHome
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'border border-white/5 bg-white/10 text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
              }`}
            >
              <item.icon size={17} className={isActive ? 'text-amber-400' : ''} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="mx-4 mb-3 h-px bg-white/10" />
      <div className="flex items-center justify-between px-4 pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <UserButton />
          <span className="truncate text-sm font-medium text-zinc-400">{dict.profile}</span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher currentLang={lang} />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

export function MobileDashboardSidebar({ dict, lang }: { dict: any; lang: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const navItems = buildNavItems(dict, lang);

  return (
    <div className="flex items-center md:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="-ms-2 rounded-lg p-2 text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <aside className="relative z-10 flex h-full w-72 max-w-[85vw] animate-in slide-in-from-start flex-col border-e border-white/10 bg-[#0A0F1C] shadow-2xl duration-200">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-5">
              <Link href={`/${lang}`} onClick={() => setIsOpen(false)} className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#F59E0B]">
                  <Sparkles size={16} className="text-[#0B1220]" />
                </div>
                <span className="text-lg font-bold tracking-tight text-white">Officia MENA</span>
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
              {navItems.map((item) => {
                const isDashboardHome = item.href === `/${lang}/dashboard`;
                const isActive = isDashboardHome
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'border border-white/5 bg-white/10 text-white shadow-sm'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                    }`}
                  >
                    <item.icon size={18} className={isActive ? 'text-amber-400' : ''} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <UserButton />
                <span className="truncate text-sm font-medium text-zinc-300">{dict.profile}</span>
              </div>
              <div className="flex items-center gap-1">
                <LanguageSwitcher currentLang={lang} />
                <ThemeToggle />
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
