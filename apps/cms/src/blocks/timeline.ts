import type { Block } from 'payload'

import { obbligatorioTesto } from '../fields/obbligatorio'

import { title } from './shared'

export const Timeline: Block = {
  slug: 'timeline',
  interfaceName: 'TimelineBlock',
  labels: { singular: 'Periodo (linea del tempo)', plural: 'Periodi (linea del tempo)' },
  fields: [
    title(),
    {
      name: 'start',
      label: 'Dal',
      type: 'text',
      required: true,
      localized: true,
      validate: obbligatorioTesto,
      admin: { description: 'Es. 19.04.2024' },
    },
    {
      name: 'end',
      label: 'Al',
      type: 'text',
      required: true,
      localized: true,
      validate: obbligatorioTesto,
      admin: { description: 'Testo libero, non serve una data precisa. Es. primavera 2028' },
    },
  ],
}
