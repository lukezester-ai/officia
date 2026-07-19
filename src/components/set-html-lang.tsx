"use client";

import { useEffect } from "react";
import { dirOf, isLocale, type Locale } from "@/lib/i18n";

export function SetHtmlLang({ lang, locale }: { lang?: string; locale?: Locale }) {
  const resolved = (locale ?? lang ?? "ar") as string;

  useEffect(() => {
    const key: Locale = isLocale(resolved) ? resolved : "ar";
    document.documentElement.lang = key;
    document.documentElement.dir = dirOf(key);
  }, [resolved]);

  return null;
}
