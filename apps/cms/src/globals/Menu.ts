import type { GlobalConfig } from 'payload'

import { anyone, isStaff } from '../access'
import { obbligatorioTesto } from '../fields/obbligatorio'

export const Menu: GlobalConfig = {
  slug: 'menu',
  label: 'Menu',
  admin: { group: 'Impostazioni' },
  access: {
    read: anyone,
    update: isStaff,
  },
  fields: [
    {
      name: 'items',
      label: 'Voci',
      type: 'array',
      labels: { singular: 'Voce', plural: 'Voci' },
      fields: [
        {
          name: 'label',
          label: 'Etichetta',
          type: 'text',
          required: true,
          localized: true,
          validate: obbligatorioTesto,
        },
        {
          // Il link è comune a tutte le lingue: il prefisso della lingua lo aggiunge il sito.
          name: 'url',
          label: 'Link',
          type: 'text',
          admin: {
            description: 'Es. /chi-siamo oppure https://… Lascia vuoto se la voce ha solo un sottomenu',
          },
        },
        {
          name: 'activities_submenu',
          label: 'Mostra le attività come sottomenu',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description:
              'Aggiunge in automatico, sotto questa voce, tutte le attività (discipline, gare, corsi…)',
          },
        },
        {
          name: 'children',
          label: 'Sottomenu',
          type: 'array',
          labels: { singular: 'Voce', plural: 'Voci' },
          fields: [
            {
              name: 'label',
              label: 'Etichetta',
              type: 'text',
              required: true,
              localized: true,
              validate: obbligatorioTesto,
            },
            { name: 'url', label: 'Link', type: 'text', required: true },
          ],
        },
      ],
    },
  ],
}
