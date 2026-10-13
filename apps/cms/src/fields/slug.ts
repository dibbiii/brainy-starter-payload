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

type OpzioniSlug = {
  /** Campo da cui ricavare lo slug se resta vuoto (predefinito: "title"). */
  da?: string
  /** Antepone la data del documento, come le news della base: 2026-05-20-titolo. */
  conData?: boolean
}

/**
 * Indirizzo del contenuto. Si sceglie alla creazione (se resta vuoto lo ricava da un altro campo) e dopo può cambiarlo solo l'amministratore: cambiarlo spezza i link che puntano al contenuto. È uguale in tutte le lingue, e separato dall'id del database.
 */
export const slugField = ({ da = 'title', conData = false }: OpzioniSlug = {}): TextField => ({
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
      ({ value, data, operation }) => {
        if (operation !== 'create' || value) return value
        const origine = data?.[da]
        if (typeof origine !== 'string' || !origine) return value
        const slug = slugify(origine)
        if (!conData) return slug
        // Senza una data (o con una non valida) si usa quella di oggi.
        const quando = data?.date ? new Date(data.date) : new Date()
        const giorno = (Number.isNaN(quando.getTime()) ? new Date() : quando).toISOString().slice(0, 10)
        return `${giorno}-${slug}`
      },
    ],
  },
})
