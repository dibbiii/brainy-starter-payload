import type { Block } from 'payload'

import { intro, title } from './shared'

export const Team: Block = {
  slug: 'team',
  interfaceName: 'TeamBlock',
  labels: { singular: 'Team', plural: 'Team' },
  fields: [
    title(),
    intro(),
    {
      name: 'limit',
      label: 'Quante persone mostrare (0 = tutte)',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'layout',
      label: 'Aspetto',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { label: 'Foto grande, ruolo e presentazione', value: 'grid' },
        { label: 'Schede centrate (es. cariche del direttivo)', value: 'officers' },
        { label: 'Schede compatte (es. responsabili di settore)', value: 'compact' },
      ],
    },
    {
      // Non è tradotto: è la chiave con cui si filtrano le persone, e deve coincidere con il campo «Gruppo» della persona in qualunque lingua.
      name: 'group',
      label: 'Mostra solo il gruppo',
      type: 'text',
      admin: {
        description:
          'Lascia vuoto per mostrare tutti. Deve coincidere con il campo «Gruppo» delle persone. Es. Cariche',
      },
    },
  ],
}
