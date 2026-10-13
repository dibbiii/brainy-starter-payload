import path from 'path'
import type { CollectionConfig } from 'payload'

import { anyone, isStaff } from '../access'
import { rootDir } from '../env'

// I file caricati stanno in una cartella separata dal codice, fuori da Git. In produzione va su un volume persistente (MEDIA_DIR). Un percorso relativo parte dalla radice del repository.
const mediaDir = path.resolve(rootDir, process.env.MEDIA_DIR || 'media')

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'File', plural: 'Media' },
  admin: { useAsTitle: 'filename' },
  access: {
    // I file sono pubblici (le pagine del sito li mostrano); li gestisce solo chi ha un account.
    read: anyone,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  upload: {
    staticDir: mediaDir,
    // Immagini e i documenti che il sito offre in download.
    mimeTypes: [
      'image/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/zip',
      'text/csv',
      'text/plain',
    ],
  },
  fields: [
    {
      name: 'alt',
      label: 'Testo alternativo',
      type: 'text',
      localized: true,
      admin: {
        description:
          "Per le immagini: descrivi cosa si vede, per chi non può vederla. Per i documenti lascia vuoto. Per un codice QR scrivi dove porta.",
      },
    },
  ],
}
