const dictionaries = {
  en: () => import('@/dictionaries/en.json').then((m) => m.default),
  de: () => import('@/dictionaries/de.json').then((m) => m.default),
  uk: () => import('@/dictionaries/uk.json').then((m) => m.default),
}

export type Locale = keyof typeof dictionaries
export type Dictionary = Awaited<ReturnType<typeof getDictionary>>

export const hasLocale = (lang: string): lang is Locale => lang in dictionaries

export async function getDictionary(lang: Locale) {
  return dictionaries[lang]()
}
