import type { Block } from 'payload'

import { intro, title } from './shared'

export const Cards: Block = {
  slug: 'cards',
  interfaceName: 'CardsBlock',
  labels: { singular: 'Schede (gare, corsi, discipline…)', plural: 'Schede (gare, corsi, discipline…)' },
  fields: [
    title(),
    intro(),
    {
      name: 'items',
      label: 'Schede',
      type: 'array',
      labels: { singular: 'Scheda', plural: 'Schede' },
      fields: [
        title(true),
        {
          name: 'highlight',
          label: 'Dato in evidenza',
          type: 'text',
          localized: true,
          admin: { description: 'Es. 120 km, Under 14, Sabato 9:00' },
        },
        { name: 'text', label: 'Testo', type: 'textarea', localized: true },
        { name: 'image', label: 'Immagine', type: 'upload', relationTo: 'media' },
        { name: 'url', label: 'Link', type: 'text' },
      ],
    },
  ],
}
