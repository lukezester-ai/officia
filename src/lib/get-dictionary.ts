import 'server-only';
import { cache } from 'react';

const dictionaries = {
  bg: () => import('../dictionaries/bg.json').then((module) => module.default),
};

export type Locale = keyof typeof dictionaries;

export const getDictionary = cache(async (locale: Locale) => dictionaries[locale]());
