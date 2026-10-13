import type { Block } from 'payload'

import { obbligatorioTesto } from '../fields/obbligatorio'

import { title } from './shared'

export const Cta: Block = {
  slug: 'cta',
  interfaceName: 'CtaBlock',
  labels: { singular: "Invito all'azione", plural: "Inviti all'azione" },
  fields: [
    title(true),
    { name: 'text', label: 'Testo', type: 'textarea', localized: true },
    { name: 'button_label', label: 'Testo pulsante', type: 'text', required: true, localized: true, validate: obbligatorioTesto },
    { name: 'button_url', label: 'Link pulsante', type: 'text', required: true },
  ],
}
