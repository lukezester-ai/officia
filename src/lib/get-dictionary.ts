import 'server-only'

const dictionaries = {
  bg: () => import('../dictionaries/bg.json').then((module) => module.default),
}

export type Locale = keyof typeof dictionaries;

export const getDictionary = async (_locale: Locale) => dictionaries.bg()
