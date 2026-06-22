'use client';
// @ts-nocheck
import { useRouter, usePathname } from 'next/navigation';
import { Button } from './ui/button';

export function LanguageSwitcher({ currentLang }: { currentLang: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = () => {
    const newLang = currentLang === 'bg' ? 'en' : 'bg';
    const newPath = pathname.replace(`/${currentLang}`, `/${newLang}`);
    router.push(newPath);
  };

  return (
    <Button variant="outline" size="sm" onClick={toggleLanguage} className="font-semibold w-12 border-slate-200 text-slate-600">
      {currentLang.toUpperCase()}
    </Button>
  );
}
