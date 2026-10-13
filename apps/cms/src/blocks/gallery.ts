import type { Block } from 'payload'

import { title } from './shared'

export const Gallery: Block = {
  slug: 'gallery',
  interfaceName: 'GalleryBlock',
  labels: { singular: 'Galleria foto', plural: 'Gallerie foto' },
  fields: [
    title(),
    {
      name: 'images',
      label: 'Foto',
      type: 'array',
      fields: [
        { name: 'image', label: 'Foto', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', label: 'Didascalia', type: 'text', localized: true },
      ],
    },
  ],
}
