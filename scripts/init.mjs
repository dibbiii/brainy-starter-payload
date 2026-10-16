// Genera il file .env alla radice a partire da .env.example: identificativo del
// progetto, credenziali del database, segreto di Payload e porte libere.
// Non sovrascrive mai un .env esistente.
//
// Uso: npm run init -- [nome-progetto] [--push]
import { spawnSync } from 'node:child_process'
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
// Gli accenti si tolgono prima (è -> e), altrimenti diventerebbero trattini.
const slug = (testo) =>
  testo
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^[^a-z0-9]+|[-_]+$/g, '')

const progetto = slug(nomeArg ?? path.basename(root))
if (!progetto) {
  console.error('Nome del progetto non valido: usa lettere, numeri e trattini.')
  process.exit(1)
}

// Utente e database di PostgreSQL: i nomi che iniziano con "pg_" sono riservati, un inizio con una
// cifra andrebbe sempre tra virgolette, e oltre 63 caratteri il nome viene troncato.
let nomeDb = progetto.replace(/-/g, '_')
if (/^(pg_|[0-9])/.test(nomeDb)) nomeDb = `db_${nomeDb}`
nomeDb = nomeDb.slice(0, 63).replace(/_+$/, '')

/** La porta si può aprire su questo indirizzo? Un indirizzo che il computer non ha (es. IPv6 spento) non conta. */
const liberaSu = (porta, indirizzo) =>
  new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', (errore) => resolve(errore.code === 'EADDRNOTAVAIL' || errore.code === 'EAFNOSUPPORT'))
    server.listen({ port: porta, host: indirizzo, ipv6Only: indirizzo === '::1' }, () => server.close(() => resolve(true)))
  })

/** Qualcuno risponde già su questa porta? Serve perché un programma in ascolto su tutte le interfacce
 * (0.0.0.0) non impedisce, su Windows e macOS, di aprire la stessa porta su 127.0.0.1. */
const occupataDa = (porta, indirizzo) =>
  new Promise((resolve) => {
    const prova = net.connect({ port: porta, host: indirizzo })
    prova.setTimeout(500)
    prova.once('connect', () => (prova.destroy(), resolve(true)))
    prova.once('timeout', () => (prova.destroy(), resolve(false)))
    prova.once('error', () => resolve(false))
  })

// Prima porta libera a partire da quella preferita, sia su IPv4 sia su IPv6: "localhost" può essere l'uno o l'altro.
const portaLibera = async (iniziale) => {
  for (let porta = iniziale; ; porta++) {
    const libera =
      !(await occupataDa(porta, '127.0.0.1')) &&
      !(await occupataDa(porta, '::1')) &&
      (await liberaSu(porta, '127.0.0.1')) &&
      (await liberaSu(porta, '::1'))
    if (libera) return porta
  }
}

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

// "wx": se nel frattempo un .env è comparso, non si sovrascrive. 0600: contiene segreti, lo legge solo il proprietario.
writeFileSync(envPath, env, { flag: 'wx', mode: 0o600 })

console.log(`Creato .env per il progetto "${progetto}".`)
console.log(`Porte: database ${porte.DB_PORT}, CMS ${porte.CMS_PORT}, sito ${porte.SITE_PORT}.`)
console.log(`PAYLOAD_DB_PUSH=${abilitaPush ? 'true (prototipazione)' : 'false (migrazioni)'}.`)
console.log('Il file contiene dei segreti e non va in Git (è già ignorato).')

// PostgreSQL legge la password solo quando il volume è vuoto: con un volume rimasto da prima
// (stesso nome di progetto) la password nuova non funzionerebbe.
const volume = `${progetto}_db-data`
const controllo = spawnSync('docker', ['volume', 'inspect', volume], { encoding: 'utf8', timeout: 10_000 })
if (controllo.status === 0) {
  console.log(`\nAttenzione: esiste già il volume Docker "${volume}" con un database di prima, creato con un'altra password.`)
  console.log(`Se non ti serve, cancellalo con: docker volume rm ${volume}`)
  console.log('Altrimenti rilancia init con un altro nome di progetto.')
} else if (controllo.error?.code !== 'ENOENT' && !/no such volume/i.test(controllo.stderr ?? '')) {
  // Docker c'è ma non risponde (es. Docker Desktop spento): il controllo del volume non si è potuto fare.
  console.log('\nNota: Docker non risponde, quindi non ho potuto controllare se esiste già un volume con questo nome.')
}
console.log('Prossimo passo: npm run db:up')
