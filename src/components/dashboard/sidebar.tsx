// @ts-nocheck
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Briefcase, Bot, Settings, Landmark, Sparkles, BarChart3, Receipt, Building2, UsersRound, FilePlus, ShoppingCart, CheckSquare } from 'lucide-react';
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
    <div className="w-64 h-screen flex flex-col fixed left-0 top-0 z-50 bg-[#0A0F1C] border-r border-white/5">
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-violet-600">
          <Sparkles size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">Officia</span>
      </div>
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
          <UserButton afterSignOutUrl="/" />
          <span className="text-sm font-medium text-zinc-400 truncate">{dict.profile}</span>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
