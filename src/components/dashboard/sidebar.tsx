'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Briefcase, Bot, Settings, LogOut, Landmark } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';

export function Sidebar({ dict, lang }: { dict: any, lang: string }) {
  const pathname = usePathname();
  
  const navItems = [
    { name: dict.dashboard, href: `/${lang}/dashboard`, icon: LayoutDashboard },
    { name: dict.accounting, href: `/${lang}/dashboard/accounting`, icon: FileText },
    { name: dict.hr, href: `/${lang}/dashboard/hr`, icon: Users },
    { name: dict.banking, href: `/${lang}/dashboard/banking`, icon: Landmark },
    { name: dict.documents, href: `/${lang}/dashboard/documents`, icon: Briefcase },
    { name: dict.aiAssistant, href: `/${lang}/dashboard/ai-assistant`, icon: Bot },
    { name: dict.settings, href: `/${lang}/dashboard/settings`, icon: Settings },
  ];
  
  return (
    <div className="w-64 h-screen bg-[#0F1F3D] text-white p-4 flex flex-col fixed left-0 top-0 z-50">
      <div className="text-2xl font-bold mb-8 tracking-tight pl-2">
        <span className="text-[#4F46E5]">O</span>fficia
      </div>
      
      <nav className="space-y-2 flex-1">
        {navItems.map((item) => {
          const isDashboardHome = item.href === `/${lang}/dashboard`;
          const isActive = isDashboardHome 
            ? pathname === item.href 
            : pathname === item.href || pathname.startsWith(item.href + '/');
            
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#4F46E5] text-white shadow-md' 
                  : 'text-gray-300 hover:bg-[#1e2e4f] hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto pt-4 border-t border-gray-700">
        <div className="px-3 flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <UserButton afterSignOutUrl="/" />
            <span className="text-sm font-medium text-white">{dict.profile}</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
