import { linkValido, messaggioLink } from '@brainy/content'
import type { Validate } from 'payload'
import { text } from 'payload/shared'

/**
 * Campo link: prima i controlli di serie del testo (obbligo, lunghezza), poi la forma del link.
 * Il valore si controlla com'è, spazi compresi, perché così finisce nello snapshot.
 */
export const validaLink: Validate = (valore, opzioni) => {
  const base = text(valore, opzioni as Parameters<typeof text>[1])
  if (base !== true) return base
  if (typeof valore !== 'string' || valore === '') return true
  return linkValido(valore) || messaggioLink
}
