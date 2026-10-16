import type { Block } from 'payload'

import { testoObbligatorio } from '../fields/obbligatorio'

import { perLingua } from './shared'

export const LatestNews: Block = {
  slug: 'latest_news',
  interfaceName: 'LatestNewsBlock',
  labels: { singular: 'Ultime news', plural: 'Ultime news' },
  fields: [
    {
      name: 'title',
      label: 'Titolo',
      type: 'text',
      localized: true,
      ...testoObbligatorio(),
      defaultValue: perLingua({ it: 'Ultime news', en: 'Latest news', de: 'Aktuelle Neuigkeiten' }),
    },
    { name: 'count', label: 'Quante news', type: 'number', defaultValue: 3, min: 1, max: 12 },
  ],
}
