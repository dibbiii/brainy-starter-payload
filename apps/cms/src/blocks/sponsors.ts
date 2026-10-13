import type { Block } from 'payload'

import { intro, title } from './shared'

export const Sponsors: Block = {
  slug: 'sponsors',
  interfaceName: 'SponsorsBlock',
  labels: { singular: 'Sponsor', plural: 'Sponsor' },
  fields: [title(), intro()],
}
