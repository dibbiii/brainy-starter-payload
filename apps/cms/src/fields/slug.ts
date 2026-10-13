import type { TextField } from 'payload'

import { isAdminField } from '../access'

/** "Corsa in montagna!" -> "corsa-in-montagna": senza accenti né simboli (è -> e, à -> a). */
export const slugify = (testo: string): string =>
  testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Indirizzo della pagina. Si sceglie alla creazione (se resta vuoto lo ricava dal titolo) e dopo può cambiarlo solo l'amministratore: cambiarlo spezza i link che puntano alla pagina.
 * È uguale in tutte le lingue, e separato dall'id del database.
 */
export const slugField: TextField = {
  name: 'slug',
  label: 'Indirizzo (slug)',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  access: { update: isAdminField },
  admin: {
    position: 'sidebar',
    description:
      "Solo minuscole, numeri e trattini. Si sceglie alla creazione e poi resta fisso: lo può cambiare solo l'amministratore.",
  },
  validate: (valore: string | null | undefined) =>
    (typeof valore === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valore)) ||
    'Usa solo minuscole, numeri e trattini (es. la-societa).',
  hooks: {
    beforeValidate: [
      ({ value, data, operation }) =>
        operation === 'create' && !value && typeof data?.title === 'string'
          ? slugify(data.title)
          : value,
    ],
  },
}
