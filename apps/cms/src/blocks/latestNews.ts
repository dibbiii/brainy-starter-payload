import type { Block } from 'payload'

import { obbligatorioTesto } from '../fields/obbligatorio'

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
      required: true,
      localized: true,
      validate: obbligatorioTesto,
      defaultValue: perLingua({ it: 'Ultime news', en: 'Latest news', de: 'Aktuelle Neuigkeiten' }),
    },
    { name: 'count', label: 'Quante news', type: 'number', defaultValue: 3, min: 1, max: 12 },
  ],
}
