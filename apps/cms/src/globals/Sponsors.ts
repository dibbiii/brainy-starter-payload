import type { GlobalConfig } from 'payload'

import { anyone, isStaff } from '../access'

export const Sponsors: GlobalConfig = {
  slug: 'sponsors',
  label: 'Sponsor',
  admin: { group: 'Impostazioni' },
  access: {
    read: anyone,
    update: isStaff,
  },
  fields: [
    {
      name: 'items',
      label: 'Sponsor',
      type: 'array',
      labels: { singular: 'Sponsor', plural: 'Sponsor' },
      fields: [
        // Il nome di uno sponsor non si traduce.
        { name: 'name', label: 'Nome', type: 'text', required: true },
        { name: 'logo', label: 'Logo', type: 'upload', relationTo: 'media' },
        { name: 'url', label: 'Sito', type: 'text' },
        {
          name: 'tier',
          label: 'Livello',
          type: 'select',
          required: true,
          defaultValue: 'partner',
          options: [
            { label: 'Principale', value: 'main' },
            { label: 'Partner', value: 'partner' },
            { label: 'Istituzionale', value: 'institutional' },
          ],
        },
      ],
    },
    {
      name: 'show_in_footer',
      label: 'Mostra gli sponsor nel piè di pagina',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
