import type { Block } from 'payload'

import { testoObbligatorio } from '../fields/obbligatorio'
import { validaLink } from '../fields/link'

export const Hero: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Copertina', plural: 'Copertine' },
  fields: [
    { name: 'title', label: 'Titolo', type: 'text', localized: true, ...testoObbligatorio() },
    { name: 'subtitle', label: 'Sottotitolo', type: 'textarea', localized: true },
    { name: 'image', label: 'Immagine di sfondo', type: 'upload', relationTo: 'media' },
    { name: 'button_label', label: 'Testo pulsante', type: 'text', localized: true },
    { name: 'button_url', label: 'Link pulsante', type: 'text', validate: validaLink },
    {
      name: 'size',
      label: 'Altezza',
      type: 'select',
      defaultValue: 'large',
      options: [
        { label: 'Grande', value: 'large' },
        { label: 'Media', value: 'medium' },
      ],
    },
  ],
}
