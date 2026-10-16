// Aggiorna i contenuti del sito dal CMS (il lavoro vero è in contenuti/aggiorna.ts).
//
// Uso: npm run contenuti:aggiorna [-- --cms=http://localhost:3000 --per-pagina=100]
//
// Il sito statico si costruisce dallo snapshot (apps/site/.snapshot) e dai media (apps/site/public/media),
// non dal CMS: la build funziona anche con il CMS spento.
import { rmSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'

import { aggiorna, prendiBlocco, type Cartelle, type Fase } from './contenuti/aggiorna'
import { ErroreCms } from './contenuti/errori'
import { indirizzoCms } from './contenuti/rest'

const sito = path.resolve(import.meta.dirname, '..')
const radice = path.resolve(sito, '../..')

// Le variabili stanno nel .env alla radice (porta del CMS compresa); quelle già nell'ambiente prevalgono.
try {
  process.loadEnvFile(path.join(radice, '.env'))
} catch (errore) {
  // Un .env che non c'è va bene (in hosting le variabili arrivano dalla piattaforma); un errore di lettura no.
  if ((errore as NodeJS.ErrnoException).code !== 'ENOENT') throw errore
}

function esci(messaggio: string): never {
  console.error(messaggio)
  process.exit(1)
}
const argomento = (nome: string) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3)

let cms: string
try {
  cms = indirizzoCms(argomento('cms') ?? process.env.CMS_URL ?? `http://localhost:${process.env.CMS_PORT ?? '3000'}`)
} catch (errore) {
  esci((errore as Error).message)
}
const perPagina = Number(argomento('per-pagina') ?? 100)
if (!Number.isInteger(perPagina) || perPagina < 1) esci('--per-pagina deve essere un numero intero maggiore di zero.')

const cartelle: Cartelle = {
  snapshot: path.join(sito, '.snapshot'),
  media: path.join(sito, 'public', 'media'),
  appoggio: path.join(sito, '.snapshot.nuovo'),
  blocco: path.join(sito, '.snapshot.lock'),
}
const stato = { fase: 'preparazione' as Fase }
let bloccoPreso = false

const spiegaInterruzione = () => {
  if (stato.fase === 'scrittura') {
    console.error("\nAggiornamento INTERROTTO A METÀ della copia dei file: lo snapshot può essere incoerente (meta.json ha stato 'in-aggiornamento').")
    console.error('Rilancia npm run contenuti:aggiorna per completarlo.')
  } else {
    console.error('\nAggiornamento NON riuscito: lo snapshot precedente è rimasto invariato.')
  }
}

// Ctrl+C (o la chiusura del terminale): si spiega cosa resta e si toglie il blocco, poi si esce.
for (const segnale of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.once(segnale, () => {
    spiegaInterruzione()
    if (bloccoPreso) {
      rmSync(cartelle.appoggio, { recursive: true, force: true })
      rmSync(cartelle.blocco, { force: true })
    }
    process.exit(130)
  })
}

try {
  await prendiBlocco(cartelle.blocco)
  bloccoPreso = true
  await aggiorna({ accesso: { cms, chiave: process.env.CMS_API_KEY?.trim() || undefined }, perPagina, cartelle, stato })
  console.log(`Snapshot in ${path.relative(radice, cartelle.snapshot)}`)
} catch (errore) {
  spiegaInterruzione()
  console.error(errore instanceof ErroreCms ? errore.message : errore)
  process.exitCode = 1
} finally {
  // La pulizia non deve cambiare l'esito: un aggiornamento riuscito resta riuscito anche se un file è occupato.
  if (bloccoPreso) {
    await rm(cartelle.appoggio, { recursive: true, force: true }).catch(() => undefined)
    await rm(cartelle.blocco, { force: true }).catch(() => undefined)
  }
}
