import type { CollectionConfig } from 'payload'

import { obbligatorioTesto } from '../fields/obbligatorio'

import { isStaff, publishedOrStaff } from '../access'
import { sectionsField } from '../fields/sections'
import { slugField } from '../fields/slug'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Pagina', plural: 'Pagine' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    group: 'Contenuti',
  },
  access: {
    // I visitatori vedono solo le pagine pubblicate; le bozze sono visibili a chi ha un account.
    read: publishedOrStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  versions: { drafts: true },
  fields: [
    { name: 'title', label: 'Titolo', type: 'text', required: true, localized: true, validate: obbligatorioTesto },
    {
      name: 'description',
      label: 'Descrizione per Google',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'show_title',
      label: 'Mostra il titolo in cima alla pagina',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'show_share',
      label: 'Pulsanti di condivisione',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Mostra in fondo i link per condividere la pagina su X e Facebook',
      },
    },
    {
      name: 'header_image',
      label: 'Immagine in cima alla pagina',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          "Si vede solo se nelle Impostazioni l'intestazione è «Fascia con briciole di pane»",
      },
    },
    sectionsField,
    slugField(),
  ],
}
