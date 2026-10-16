import path from 'path'
import { APIError, type CollectionConfig } from 'payload'

import { anyone, isStaff } from '../access'
import { rootDir } from '../env'

// I file caricati stanno in una cartella separata dal codice, fuori da Git. In produzione va su un volume persistente (MEDIA_DIR). Un percorso relativo parte dalla radice del repository.
const mediaDir = path.resolve(rootDir, process.env.MEDIA_DIR || 'media')

// Tipi ammessi e le loro estensioni. Payload controlla il contenuto del file ma non l'estensione:
// un PDF chiamato "x.html" passerebbe, e il sito lo servirebbe come pagina web.
const ESTENSIONI: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'image/avif': ['avif'],
  'image/svg+xml': ['svg'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'application/vnd.oasis.opendocument.text': ['odt'],
  'application/vnd.oasis.opendocument.spreadsheet': ['ods'],
  'application/zip': ['zip'],
  'text/csv': ['csv'],
  'text/plain': ['txt'],
}

const ESTENSIONI_AMMESSE = new Set(Object.values(ESTENSIONI).flat())

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'File', plural: 'Media' },
  admin: { useAsTitle: 'filename', group: 'Contenuti' },
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
    mimeTypes: Object.keys(ESTENSIONI),
    // Le foto si rielaborano: girate secondo l'EXIF, ridotte se enormi e salvate senza metadati
    // (posizione GPS, modello del telefono…), che altrimenti finirebbero pubblici sul sito.
    resizeOptions: { width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true },
  },
  hooks: {
    beforeChange: [
      // Conta l'estensione, non il tipo dichiarato dal browser (per un .csv a volte è quello di Excel).
      // Le immagini le rinomina già Payload in base al contenuto. Solo con un file nuovo: un file
      // vecchio resta modificabile (es. il testo alternativo) anche se oggi non sarebbe ammesso.
      ({ data, req }) => {
        if (!req.file || typeof data.filename !== 'string') return data
        const estensione = path.extname(data.filename).slice(1).toLowerCase()
        if (!ESTENSIONI_AMMESSE.has(estensione)) {
          throw new APIError(
            `I file .${estensione || '(senza estensione)'} non sono ammessi. Ammessi: ${[...ESTENSIONI_AMMESSE].map((e) => `.${e}`).join(', ')}.`,
            400,
            undefined,
            true,
          )
        }
        return data
      },
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
