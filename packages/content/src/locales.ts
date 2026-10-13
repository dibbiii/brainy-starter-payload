// Lingue dei contenuti: le legge il CMS (Payload) e il sito (Astro).
// Aggiungerne una cambia lo schema del database (in PostgreSQL le lingue sono un tipo enumerato): oltre a questo elenco serve una nuova migrazione.

export const locales = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
] as const

export type LocaleCode = (typeof locales)[number]['code']

/** Lingua usata quando una traduzione manca, e senza prefisso nell'indirizzo del sito. */
export const defaultLocale: LocaleCode = 'it'
