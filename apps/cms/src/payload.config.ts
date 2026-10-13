// Per primo: carica il .env prima che gli altri file leggano process.env.
import './env'

import { defaultLocale, locales } from '@brainy/content'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { it } from '@payloadcms/translations/languages/it'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { sectionBlocks } from './blocks'
import { Activities } from './collections/Activities'
import { Media } from './collections/Media'
import { News } from './collections/News'
import { Pages } from './collections/Pages'
import { Team } from './collections/Team'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// DATABASE_URL, se presente, ha la precedenza (database esterno); altrimenti
// l'indirizzo si ricava dalle stesse variabili DB_* usate da Compose.
const { DB_USER = '', DB_PASSWORD = '', DB_NAME = '', DB_PORT = '5433' } = process.env
const databaseUrl =
  process.env.DATABASE_URL ||
  `postgres://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@localhost:${DB_PORT}/${encodeURIComponent(DB_NAME)}`

// Il push di Drizzle crea le tabelle da solo: va bene per prototipare in locale,
// non per i database dei clienti, che usano le migrazioni. Resta spento se non
// viene chiesto esplicitamente e non parte mai in produzione.
const pushAbilitato = process.env.PAYLOAD_DB_PUSH === 'true' && process.env.NODE_ENV !== 'production'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // I blocchi delle sezioni si definiscono qui una volta sola e si richiamano per nome (campo sections).
  blocks: sectionBlocks,
  collections: [Users, Media, Pages, Activities, Team, News],
  editor: lexicalEditor(),
  // Pannello solo in italiano: con una sola lingua il codice caricato dal browser è più piccolo e un browser in inglese vede comunque l'italiano.
  i18n: {
    supportedLanguages: { it },
    fallbackLanguage: 'it',
  },
  // Lingue dei contenuti (l'elenco è condiviso con il sito). Se una traduzione manca, Payload restituisce il testo della lingua predefinita.
  localization: {
    locales: locales.map(({ code, label }) => ({ code, label })),
    defaultLocale,
    fallback: true,
  },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: { connectionString: databaseUrl },
    push: pushAbilitato,
  }),
  sharp,
})
