import type { Block } from 'payload'

import { obbligatorioFile, testoObbligatorio } from '../fields/obbligatorio'

import { title } from './shared'

export const Documents: Block = {
  slug: 'documents',
  interfaceName: 'DocumentsBlock',
  labels: { singular: 'Documenti da scaricare', plural: 'Documenti da scaricare' },
  fields: [
    title(),
    {
      name: 'files',
      label: 'File',
      type: 'array',
      labels: { singular: 'Documento', plural: 'Documenti' },
      fields: [
        { name: 'label', label: 'Nome', type: 'text', localized: true, ...testoObbligatorio() },
        {
          // Un documento (es. lo statuto) di solito esiste in una versione per lingua. Se manca, vale quello della lingua predefinita.
          name: 'file',
          label: 'File',
          type: 'upload',
          relationTo: 'media',
          required: true,
          localized: true,
          validate: obbligatorioFile,
        },
        {
          name: 'year',
          label: 'Anno',
          type: 'text',
          admin: {
            description: 'Facoltativo. Es. 2024. Si vede accanto al nome e serve a ordinare',
          },
        },
      ],
    },
    {
      name: 'sort',
      label: 'Ordine',
      type: 'select',
      defaultValue: 'entered',
      options: [
        { label: 'Come inseriti', value: 'entered' },
        { label: 'Dal più recente (per anno)', value: 'newest' },
        { label: 'Dal meno recente (per anno)', value: 'oldest' },
      ],
    },
    {
      name: 'show_open',
      label: 'Mostra anche il pulsante Apri',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Apre il file in una nuova scheda, oltre a Scarica' },
    },
  ],
}
