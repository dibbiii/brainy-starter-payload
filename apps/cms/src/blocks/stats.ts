import type { Block } from 'payload'

import { testoObbligatorio } from '../fields/obbligatorio'

import { title } from './shared'

export const Stats: Block = {
  slug: 'stats',
  interfaceName: 'StatsBlock',
  labels: { singular: 'Numeri', plural: 'Numeri' },
  fields: [
    title(),
    {
      name: 'layout',
      label: 'Aspetto',
      type: 'select',
      defaultValue: 'row',
      options: [
        { label: 'In riga, divisi da filetti', value: 'row' },
        { label: 'Schede separate', value: 'cards' },
      ],
    },
    {
      name: 'items',
      label: 'Numeri',
      type: 'array',
      labels: { singular: 'Numero', plural: 'Numeri' },
      minRows: 2,
      maxRows: 4,
      fields: [
        {
          // Testo, non numero: può avere lo zero iniziale o un'unità. Tradotto perché può contenere parole (es. "Dal 1947").
          name: 'value',
          label: 'Numero',
          type: 'text',
          localized: true,
          ...testoObbligatorio(),
          admin: { description: 'Anche con testo o zero iniziale. Es. 1947, 07, 120 km' },
        },
        {
          name: 'label',
          label: 'Descrizione',
          type: 'text',
          localized: true,
          ...testoObbligatorio(),
          admin: { description: 'Es. Anno di fondazione' },
        },
      ],
    },
  ],
}
