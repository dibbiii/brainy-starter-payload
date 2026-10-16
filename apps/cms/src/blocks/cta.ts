import type { Block } from 'payload'

import { testoObbligatorio } from '../fields/obbligatorio'

import { title } from './shared'
import { validaLink } from '../fields/link'

export const Cta: Block = {
  slug: 'cta',
  interfaceName: 'CtaBlock',
  labels: { singular: "Invito all'azione", plural: "Inviti all'azione" },
  fields: [
    title(true),
    { name: 'text', label: 'Testo', type: 'textarea', localized: true },
    { name: 'button_label', label: 'Testo pulsante', type: 'text', localized: true, ...testoObbligatorio() },
    { name: 'button_url', label: 'Link pulsante', type: 'text', validate: validaLink, required: true },
  ],
}
