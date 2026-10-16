import type { PayloadRequest } from 'payload'

/**
 * Esegue una lettura dentro la stessa richiesta (e transazione) senza cambiarla.
 * L'API locale scrive in `req` la lingua (`locale`, `fallbackLocale`), il `context` e la profondità
 * della lettura: dentro un hook, senza rimetterli, il salvataggio in corso continuerebbe con quelli.
 */
export async function stessaLingua<T>(req: PayloadRequest, leggi: () => Promise<T>): Promise<T> {
  const { locale, fallbackLocale, context } = req
  const profondita = req.query?.depth
  try {
    return await leggi()
  } finally {
    req.locale = locale
    req.fallbackLocale = fallbackLocale
    req.context = context
    if (req.query) req.query.depth = profondita
  }
}
