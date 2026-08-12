// next-intl.config.js
import { defineConfig } from 'next-intl/config';

export default defineConfig({
  defaultLocale: 'bg',
  locales: ['bg', 'en'],
  localeDetection: true,
});
