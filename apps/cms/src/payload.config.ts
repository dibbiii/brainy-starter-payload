import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Media } from './collections/Media'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

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
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    push: pushAbilitato,
  }),
  sharp,
})
