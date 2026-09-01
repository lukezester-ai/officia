// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const resolvedLocale = 'bg';
  const messages = (await import('../messages/bg.json')).default;
  return {
    locale: resolvedLocale,
    messages,
  };
});
