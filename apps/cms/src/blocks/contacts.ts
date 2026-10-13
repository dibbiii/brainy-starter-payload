import type { Block } from 'payload'

import { obbligatorioTesto } from '../fields/obbligatorio'

import { intro, perLingua } from './shared'

export const Contacts: Block = {
  slug: 'contacts',
  interfaceName: 'ContactsBlock',
  labels: { singular: 'Contatti', plural: 'Contatti' },
  fields: [
    {
      name: 'title',
      label: 'Titolo',
      type: 'text',
      required: true,
      localized: true,
      validate: obbligatorioTesto,
      defaultValue: perLingua({ it: 'Contatti', en: 'Contact', de: 'Kontakt' }),
    },
    intro(),
    {
      name: 'image',
      label: 'Immagine a lato',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Facoltativa. Es. il codice QR del gruppo WhatsApp' },
    },
    { name: 'image_caption', label: 'Didascalia', type: 'text', localized: true },
  ],
}
