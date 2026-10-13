import type { Block } from 'payload'

import { intro, title } from './shared'

export const Activities: Block = {
  slug: 'activities',
  interfaceName: 'ActivitiesBlock',
  labels: {
    singular: 'Elenco delle attività (discipline, gare, corsi…)',
    plural: 'Elenchi delle attività (discipline, gare, corsi…)',
  },
  fields: [
    title(),
    intro(),
    {
      name: 'link_label',
      label: 'Testo del link a destra del titolo',
      type: 'text',
      localized: true,
      admin: { description: 'Es. I responsabili di settore. Compare solo se compili anche il link' },
    },
    { name: 'link_url', label: 'Indirizzo del link', type: 'text' },
    { name: 'show_managers', label: 'Mostra i responsabili', type: 'checkbox', defaultValue: true },
  ],
}
