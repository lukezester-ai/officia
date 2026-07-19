export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ar';

export const localeMeta: Record<
  Locale,
  { label: string; nativeLabel: string; dir: 'rtl' | 'ltr'; currency: string; currencySymbol: string }
> = {
  ar: {
    label: 'Arabic',
    nativeLabel: 'العربية',
    dir: 'rtl',
    currency: 'AED',
    currencySymbol: 'د.إ',
  },
  en: {
    label: 'English',
    nativeLabel: 'English',
    dir: 'ltr',
    currency: 'AED',
    currencySymbol: 'AED',
  },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getLocaleDir(lang: string): 'rtl' | 'ltr' {
  return isLocale(lang) ? localeMeta[lang].dir : 'rtl';
}

/** Alias used by client RTL helpers */
export const dirOf = getLocaleDir;
