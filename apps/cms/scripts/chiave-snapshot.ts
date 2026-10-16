// Crea la chiave di lettura per lo snapshot del sito e la scrive in CMS_API_KEY nel .env alla radice.
//
// Uso: npm run chiave:snapshot   (con il database acceso)
// Per sostituirla: cancella "Snapshot del sito" da Amministrazione → Chiavi di lettura e rilancia.
import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import { rootDir } from '../src/env'
import config from '../src/payload.config'

const NOME = 'Snapshot del sito'
const fileEnv = path.join(rootDir, '.env')

const payload = await getPayload({ config })
const esistenti = await payload.find({ collection: 'chiavi-api', where: { nome: { equals: NOME } }, limit: 1 })
if (esistenti.totalDocs > 0) {
  console.error(`La chiave "${NOME}" esiste già. Per crearne una nuova cancellala dal pannello (Amministrazione → Chiavi di lettura).`)
  process.exit(1)
}

const chiave = randomBytes(32).toString('hex')
await payload.create({ collection: 'chiavi-api', data: { nome: NOME, enableAPIKey: true, apiKey: chiave } })

// Nel .env la chiave si aggiunge, o prende il posto di una riga CMS_API_KEY vuota; un valore già scritto non si tocca.
let env = ''
try {
  env = await readFile(fileEnv, 'utf8')
} catch (errore) {
  if ((errore as NodeJS.ErrnoException).code !== 'ENOENT') throw errore
}
// Vuota anche con le virgolette o solo spazi (CMS_API_KEY="").
const RIGA_VUOTA = /^CMS_API_KEY=\s*(""|'')?\s*$/m
if (/^CMS_API_KEY=/m.test(env) && !RIGA_VUOTA.test(env)) {
  console.log(`Chiave creata. Nel .env c'è già un CMS_API_KEY: sostituiscilo a mano con\n  CMS_API_KEY=${chiave}`)
} else {
  const riga = `CMS_API_KEY=${chiave}`
  const nuovo = RIGA_VUOTA.test(env)
    ? env.replace(RIGA_VUOTA, riga)
    : `${env}${env && !env.endsWith('\n') ? '\n' : ''}\n# Chiave di lettura dello snapshot (npm run chiave:snapshot)\n${riga}\n`
  try {
    await writeFile(fileEnv, nuovo, { mode: 0o600 })
  } catch (errore) {
    // La chiave è già nel database: senza questo messaggio andrebbe persa.
    console.error(`Chiave creata, ma il .env non si può scrivere (${(errore as Error).message}). Aggiungi a mano:\n  CMS_API_KEY=${chiave}`)
    process.exit(1)
  }
  console.log(`Chiave creata e scritta in CMS_API_KEY nel .env (${fileEnv}).`)
}
process.exit(0)
