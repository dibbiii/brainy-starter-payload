// Genera il file .env alla radice a partire da .env.example: identificativo del
// progetto, credenziali del database, segreto di Payload e porte libere.
// Non sovrascrive mai un .env esistente.
//
// Uso: npm run init -- [nome-progetto] [--push]
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env')
const templatePath = path.join(root, '.env.example')

const args = process.argv.slice(2)
const abilitaPush = args.includes('--push')
const nomeArg = args.find((a) => !a.startsWith('--'))

if (existsSync(envPath)) {
  console.log('.env esiste già: non è stato modificato.')
  console.log('Per ripartire da zero cancellalo a mano (le credenziali attuali andrebbero perse).')
  process.exit(0)
}

// Compose accetta solo minuscole, numeri, trattini e underscore, e un inizio alfanumerico.
const slug = (testo) =>
  testo
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^[^a-z0-9]+|[-_]+$/g, '')

const progetto = slug(nomeArg ?? path.basename(root))
if (!progetto) {
  console.error('Nome del progetto non valido: usa lettere, numeri e trattini.')
  process.exit(1)
}
const nomeDb = progetto.replace(/-/g, '_')

// Prima porta libera a partire da quella preferita (prova sull'indirizzo locale).
const portaLibera = (iniziale) =>
  new Promise((resolve) => {
    const prova = (porta) => {
      const server = net.createServer()
      server.once('error', () => prova(porta + 1))
      server.listen(porta, '127.0.0.1', () => server.close(() => resolve(porta)))
    }
    prova(iniziale)
  })

const porte = {}
const occupate = new Set()
for (const [chiave, iniziale] of [
  ['DB_PORT', 5433],
  ['CMS_PORT', 3000],
  ['SITE_PORT', 4322],
]) {
  let porta = await portaLibera(iniziale)
  while (occupate.has(porta)) porta = await portaLibera(porta + 1)
  occupate.add(porta)
  porte[chiave] = porta
}

const valori = {
  COMPOSE_PROJECT_NAME: progetto,
  DB_USER: nomeDb,
  DB_PASSWORD: randomBytes(24).toString('base64url'),
  DB_NAME: nomeDb,
  ...porte,
  PAYLOAD_SECRET: randomBytes(32).toString('hex'),
  ...(abilitaPush ? { PAYLOAD_DB_PUSH: 'true' } : {}),
}

// Sostituisce solo le righe CHIAVE=valore del modello: commenti e righe
// commentate (come DATABASE_URL) restano come sono.
const env = readFileSync(templatePath, 'utf8')
  .split(/\r?\n/)
  .map((riga) => {
    const chiave = riga.match(/^([A-Z_]+)=/)?.[1]
    return chiave && chiave in valori ? `${chiave}=${valori[chiave]}` : riga
  })
  .join('\n')

writeFileSync(envPath, env)

console.log(`Creato .env per il progetto "${progetto}".`)
console.log(`Porte: database ${porte.DB_PORT}, CMS ${porte.CMS_PORT}, sito ${porte.SITE_PORT}.`)
console.log(`PAYLOAD_DB_PUSH=${abilitaPush ? 'true (prototipazione)' : 'false (migrazioni)'}.`)
console.log('Il file contiene dei segreti e non va in Git (è già ignorato).')
console.log('Prossimo passo: npm run db:up')
