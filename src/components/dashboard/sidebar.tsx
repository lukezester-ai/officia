'use client';
// @ts-nocheck
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Briefcase, Bot, Settings, Landmark, Sparkles, BarChart3, Receipt, Building2, UsersRound, FilePlus, ShoppingCart, CheckSquare, Menu, X } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';

export function Sidebar({ dict, lang }: { dict: any; lang: string }) {
  const pathname = usePathname();
  const navItems = [
    { name: dict.dashboard, href: `/${lang}/dashboard`, icon: LayoutDashboard },
    { name: dict.accounting, href: `/${lang}/dashboard/accounting`, icon: FileText },
    { name: dict.hr, href: `/${lang}/dashboard/hr`, icon: Users },
    { name: "ТРЗ (Заплати)", href: `/${lang}/dashboard/payroll`, icon: Receipt },
    { name: dict.banking, href: `/${lang}/dashboard/banking`, icon: Landmark },
    { name: dict.documents, href: `/${lang}/dashboard/documents`, icon: Briefcase },
    { name: "AI Задачи", href: `/${lang}/dashboard/tasks`, icon: CheckSquare },
    { name: dict.reports, href: `/${lang}/dashboard/accounting/reports`, icon: BarChart3 },
    { name: dict.vatJournals, href: `/${lang}/dashboard/vat-journals`, icon: Receipt },
    { name: "Склад (Наличности)", href: `/${lang}/dashboard/inventory`, icon: ShoppingCart },
    { name: dict.fixedAssets, href: `/${lang}/dashboard/fixed-assets`, icon: Building2 },
    { name: dict.counterparties, href: `/${lang}/dashboard/counterparties`, icon: UsersRound },
    { name: dict.invoices, href: `/${lang}/dashboard/invoices`, icon: FilePlus },
    { name: dict.purchaseInvoices, href: `/${lang}/dashboard/purchase-invoices`, icon: ShoppingCart },
    { name: "Данъци", href: `/${lang}/dashboard/taxes`, icon: FileText },
    { name: dict.aiAssistant, href: `/${lang}/dashboard/ai-assistant`, icon: Bot },
    { name: dict.settings, href: `/${lang}/dashboard/settings`, icon: Settings },
  ];
  return (
    <aside className="hidden md:flex w-64 h-screen flex-col fixed left-0 top-0 z-50 bg-[#0A0F1C] border-r border-white/5">
      <Link href={`/${lang}`} className="px-5 py-5 flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-violet-600">
          <Sparkles size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">Officia</span>
      </Link>

      <div className="mx-4 mb-4 h-px bg-white/10" />
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isDashboardHome = item.href === `/${lang}/dashboard`;
          const isActive = isDashboardHome
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium ${
                isActive
                  ? 'bg-white/10 text-white shadow-sm border border-white/5'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
              }`}
            >
              <item.icon size={17} className={isActive ? "text-violet-400" : ""} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="mx-4 mb-3 h-px bg-white/10" />
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <UserButton />
          <span className="text-sm font-medium text-zinc-400 truncate">{dict.profile}</span>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}

export function MobileDashboardSidebar({ dict, lang }: { dict: any; lang: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const navItems = [
    { name: dict.dashboard, href: `/${lang}/dashboard`, icon: LayoutDashboard },
    { name: dict.accounting, href: `/${lang}/dashboard/accounting`, icon: FileText },
    { name: dict.hr, href: `/${lang}/dashboard/hr`, icon: Users },
    { name: "ТРЗ (Заплати)", href: `/${lang}/dashboard/payroll`, icon: Receipt },
    { name: dict.banking, href: `/${lang}/dashboard/banking`, icon: Landmark },
    { name: dict.documents, href: `/${lang}/dashboard/documents`, icon: Briefcase },
    { name: "AI Задачи", href: `/${lang}/dashboard/tasks`, icon: CheckSquare },
    { name: dict.reports, href: `/${lang}/dashboard/accounting/reports`, icon: BarChart3 },
    { name: dict.vatJournals, href: `/${lang}/dashboard/vat-journals`, icon: Receipt },
    { name: "Склад (Наличности)", href: `/${lang}/dashboard/inventory`, icon: ShoppingCart },
    { name: dict.fixedAssets, href: `/${lang}/dashboard/fixed-assets`, icon: Building2 },
    { name: dict.counterparties, href: `/${lang}/dashboard/counterparties`, icon: UsersRound },
    { name: dict.invoices, href: `/${lang}/dashboard/invoices`, icon: FilePlus },
    { name: dict.purchaseInvoices, href: `/${lang}/dashboard/purchase-invoices`, icon: ShoppingCart },
    { name: "Данъци", href: `/${lang}/dashboard/taxes`, icon: FileText },
    { name: dict.aiAssistant, href: `/${lang}/dashboard/ai-assistant`, icon: Bot },
    { name: dict.settings, href: `/${lang}/dashboard/settings`, icon: Settings },
  ];

  return (
    <div className="md:hidden flex items-center">
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 -ml-2 text-zinc-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        aria-label="Отвори меню"
      >
        <Menu size={22} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-over Drawer */}
          <aside className="relative w-72 max-w-[85vw] h-full bg-[#0A0F1C] border-r border-white/10 flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="px-5 py-5 flex items-center justify-between border-b border-white/5">
              <Link href={`/${lang}`} onClick={() => setIsOpen(false)} className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-violet-600">
                  <Sparkles size={16} className="text-white" />
                </div>
                <span className="text-white font-bold text-lg tracking-tight">Officia</span>
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
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
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 text-sm font-medium ${
                      isActive
                        ? 'bg-white/10 text-white shadow-sm border border-white/5'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={18} className={isActive ? "text-violet-400" : ""} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="px-4 py-4 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserButton />
                <span className="text-sm font-medium text-zinc-300 truncate">{dict.profile}</span>
              </div>
              <ThemeToggle />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
