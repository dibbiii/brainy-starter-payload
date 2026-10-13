import type { Block } from 'payload'

import { obbligatorioTestoFormattato } from '../fields/obbligatorio'

import { title } from './shared'

export const TextImage: Block = {
  slug: 'text_image',
  interfaceName: 'TextImageBlock',
  labels: { singular: 'Testo con immagine', plural: 'Testi con immagine' },
  fields: [
    title(),
    { name: 'content', label: 'Contenuto', type: 'richText', required: true, localized: true, validate: obbligatorioTestoFormattato },
    { name: 'image', label: 'Immagine', type: 'upload', relationTo: 'media', required: true },
    {
      name: 'image_side',
      label: 'Immagine a',
      type: 'select',
      defaultValue: 'right',
      options: [
        { label: 'Destra', value: 'right' },
        { label: 'Sinistra', value: 'left' },
      ],
    },
  ],
}
