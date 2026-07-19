import 'server-only';
import { cache } from 'react';
import { defaultLocale, isLocale, type Locale } from '@/lib/i18n';

const dictionaries = {
  ar: () => import('../dictionaries/ar.json').then((module) => module.default),
  en: () => import('../dictionaries/en.json').then((module) => module.default),
};

export type { Locale };

export const getDictionary = cache(async (locale: string) => {
  const key: Locale = isLocale(locale) ? locale : defaultLocale;
  return dictionaries[key]();
});
