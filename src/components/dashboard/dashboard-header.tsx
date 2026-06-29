'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { LanguageSwitcher } from '@/components/language-switcher';
import { GlobalSearch, SearchTrigger } from '@/components/search/global-search';

type HeaderLabels = {
  searchPlaceholder: string;
  searchAria: string;
  searchTitle: string;
  notificationsAria: string;
  notificationsTitle: string;
};

export function DashboardHeader({ lang, labels }: { lang: string; labels: HeaderLabels }) {
  return (
    <>
      <GlobalSearch />
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/5 bg-background/50 px-6 backdrop-blur-md">
        <div className="flex flex-1 items-center gap-3 max-w-md lg:max-w-lg">
          <SearchTrigger />
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher currentLang={lang} />
          <Link
            href={`/${lang}/dashboard/tasks`}
            aria-label={labels.notificationsAria}
            title={labels.notificationsTitle}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
          </Link>
          <div className="h-5 w-px bg-border" />
          <UserButton />
        </div>
      </header>
    </>
  );
}
