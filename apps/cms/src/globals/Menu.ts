import type { GlobalConfig } from 'payload'

import { anyone, isStaff } from '../access'
import { versioneItalianaGlobale } from '../hooks/versioneItaliana'
import { testoObbligatorio } from '../fields/obbligatorio'
import { validaLink } from '../fields/link'

export const Menu: GlobalConfig = {
  slug: 'menu',
  label: 'Menu',
  admin: { group: 'Impostazioni' },
  hooks: { beforeChange: [versioneItalianaGlobale] },
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
          localized: true,
          ...testoObbligatorio(),
        },
        {
          // Il link è comune a tutte le lingue: il prefisso della lingua lo aggiunge il sito.
          name: 'url',
          label: 'Link',
          type: 'text',
          validate: validaLink,
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
              localized: true,
              ...testoObbligatorio(),
            },
            { name: 'url', label: 'Link', type: 'text', validate: validaLink, required: true },
          ],
        },
      ],
    },
  ],
}
