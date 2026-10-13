import type { Block } from 'payload'

import { title } from './shared'

export const Video: Block = {
  slug: 'video',
  interfaceName: 'VideoBlock',
  labels: { singular: 'Video YouTube', plural: 'Video YouTube' },
  fields: [
    title(),
    {
      name: 'url',
      label: 'Link del video',
      type: 'text',
      required: true,
      admin: {
        description:
          'Incolla il link di YouTube. Il video si carica solo dopo il clic del visitatore (GDPR).',
      },
    },
  ],
}
