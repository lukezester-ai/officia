"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function onSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as "bg" | "en";
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <select
      defaultValue={locale}
      onChange={onSelectChange}
      className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-navy shadow-sm transition hover:border-indigo-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
    >
      <option value="bg">🇧🇬 БГ</option>
      <option value="en">🇬🇧 EN</option>
    </select>
  );
}
