'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { defaultLocale, isLocale, locales, type Locale } from '@/lib/i18n';

export function LanguageSwitcher({ currentLang }: { currentLang: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const active: Locale = isLocale(currentLang) ? currentLang : defaultLocale;
  const nextLang: Locale = active === 'ar' ? 'en' : 'ar';

  const toggleLanguage = () => {
    const segments = pathname.split('/');
    if (segments.length > 1 && isLocale(segments[1])) {
      segments[1] = nextLang;
    } else {
      segments.splice(1, 0, nextLang);
    }
    router.push(segments.join('/') || `/${nextLang}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="w-auto min-w-12 border-white/15 bg-white/[0.03] font-semibold text-[#F8FAFC] hover:bg-white/10"
      aria-label={`Switch language to ${nextLang}`}
      title={locales.map((l) => l.toUpperCase()).join(' / ')}
    >
      {active.toUpperCase()}
    </Button>
  );
}
