import type { Block } from 'payload'

import { obbligatorioTestoFormattato } from '../fields/obbligatorio'

import { title } from './shared'

export const Text: Block = {
  slug: 'text',
  interfaceName: 'TextBlock',
  labels: { singular: 'Testo', plural: 'Testi' },
  fields: [
    title(),
    { name: 'content', label: 'Contenuto', type: 'richText', required: true, localized: true, validate: obbligatorioTestoFormattato },
  ],
}
