import type { TextField } from 'payload'

/** Colore come testo esadecimale #rrggbb, con il selettore di colore al posto della casella di testo. */
export const campoColore = (name: string, label: string, description?: string): TextField => ({
  name,
  label,
  type: 'text',
  required: true,
  validate: (valore: string | null | undefined) =>
    (typeof valore === 'string' && /^#[0-9a-fA-F]{6}$/.test(valore)) ||
    'Scrivi il colore come codice esadecimale di 6 cifre, es. #24493d.',
  admin: {
    components: { Field: '/components/ColorField#ColorField' },
    ...(description ? { description } : {}),
  },
})
