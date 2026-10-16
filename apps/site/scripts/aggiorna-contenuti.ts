// Aggiorna i contenuti del sito dal CMS: legge le API, valida, scarica i media e scrive lo snapshot.
//
// Uso: npm run contenuti:aggiorna [-- --cms=http://localhost:3000 --per-pagina=100]
//
// Il sito statico si costruisce dallo snapshot (apps/site/.snapshot) e dai media (apps/site/public/media),
// non dal CMS: la build funziona anche con il CMS spento.
//
// Due fasi:
// - PREPARAZIONE: si legge, si valida e si scarica tutto in una cartella di appoggio. Se qualcosa non va
//   (CMS spento, dati non validi, un media che non si scarica) non si tocca niente: lo snapshot
//   precedente resta com'è e si dice cosa è successo.
// - SCRITTURA: si copiano i file nel posto vero. Se si interrompe qui, meta.json resta con stato
//   "in-aggiornamento" e basta rilanciare il comando.
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { defaultLocale, locales, snapshotLingua, snapshotMeta } from '@brainy/content'

import { campiScartati, riferimentiRotti } from './contenuti/controlli'
import { ErroreCms } from './contenuti/errori'
import { globale, nuovoContesto, voce } from './contenuti/normalizza'
import { leggiCollezione, leggiGlobale, scaricaFile } from './contenuti/rest'
import { copiaNuovi, potaVecchi, scriviJson } from './contenuti/scrivi'

const sito = path.resolve(import.meta.dirname, '..')
const radice = path.resolve(sito, '../..')

// Le variabili stanno nel .env alla radice (porta del CMS compresa); quelle già nell'ambiente prevalgono.
try {
  process.loadEnvFile(path.join(radice, '.env'))
} catch (errore) {
  // Un .env che non c'è va bene (in hosting le variabili arrivano dalla piattaforma); un errore di lettura no.
  if ((errore as NodeJS.ErrnoException).code !== 'ENOENT') throw errore
}

const argomento = (nome: string) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3)

const cms = (argomento('cms') ?? process.env.CMS_URL ?? `http://localhost:${process.env.CMS_PORT ?? '3000'}`).replace(/\/+$/, '')
const perPagina = Number(argomento('per-pagina') ?? 100)
if (!Number.isInteger(perPagina) || perPagina < 1) {
  console.error('--per-pagina deve essere un numero intero maggiore di zero.')
  process.exit(1)
}

const cartellaSnapshot = path.join(sito, '.snapshot')
const cartellaMedia = path.join(sito, 'public', 'media')
const appoggio = path.join(sito, '.snapshot.nuovo')
const fileBlocco = path.join(sito, '.snapshot.lock')

const COLLEZIONI = ['pages', 'activities', 'news', 'team'] as const
const IMPOSTAZIONI = ['site', 'theme', 'menu', 'sponsors'] as const
// Collegamenti tra contenuti: diventano slug (come gli id della base).
const COLLEGAMENTI: Record<string, Record<string, 'uno' | 'molti'>> = {
  activities: { managers: 'molti' },
  news: { activity: 'uno' },
}

type Fase = 'preparazione' | 'scrittura'
// "as Fase": la fase cambia dentro `aggiorna()`, e senza questo TypeScript la crede sempre "preparazione".
let fase = 'preparazione' as Fase

/** Impedisce due aggiornamenti insieme: si cancellerebbero a vicenda la cartella di appoggio. */
async function prendiBlocco() {
  try {
    await writeFile(fileBlocco, String(process.pid), { flag: 'wx' })
  } catch (errore) {
    if ((errore as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new ErroreCms(
        `Un altro aggiornamento è in corso. Se non è vero (è rimasto il file di blocco dopo un'interruzione), cancella ${path.relative(radice, fileBlocco)}.`,
      )
    }
    throw errore
  }
}

async function aggiorna() {
  const inizio = Date.now()
  console.log(`Aggiorno i contenuti da ${cms}`)

  await rm(appoggio, { recursive: true, force: true })
  await mkdir(appoggio, { recursive: true })

  const ctx = nuovoContesto()
  const problemi: string[] = []
  const conteggi: Record<string, Record<string, number>> = {}

  for (const { code } of locales) {
    // Le traduzioni mancanti ripiegano sulla lingua predefinita: ogni lingua è completa.
    const parametri = `locale=${code}&fallback-locale=${defaultLocale}`
    const dati: Record<string, unknown> = {}
    for (const collezione of COLLEZIONI) {
      const documenti = (await leggiCollezione(cms, collezione, parametri, perPagina)) as Record<string, unknown>[]
      dati[collezione] = documenti.map((d) => voce(collezione, d, ctx, COLLEGAMENTI[collezione]))
    }
    for (const nome of IMPOSTAZIONI) {
      dati[nome] = globale(nome, await leggiGlobale(cms, nome, parametri), ctx)
    }

    // La validazione dice quale contenuto e quale campo non vanno, non solo "dati non validi".
    const esito = snapshotLingua.safeParse(dati)
    if (!esito.success) {
      for (const problema of esito.error.issues) {
        const [radiceDelPercorso, indice, ...resto] = problema.path
        const elenco = dati[String(radiceDelPercorso)]
        const id = Array.isArray(elenco) && typeof indice === 'number' ? (elenco[indice] as { id?: string })?.id : undefined
        const dove = id ? `${String(radiceDelPercorso)}/${id}` : String(radiceDelPercorso)
        // Si toglie "data" (è il contenitore interno di ogni voce): il campo è quello che l'editor vede.
        const campo = (id ? resto : [indice, ...resto]).filter((p) => p !== undefined && p !== 'data').join('.')
        problemi.push(`[${code}] ${dove}${campo ? ` → ${campo}` : ''}: ${problema.message}`)
      }
      continue
    }

    // Lo schema scarta in silenzio i campi che non conosce: qui diventa un errore, così un campo aggiunto
    // al CMS e dimenticato in packages/content/src/schema.ts non sparisce dal sito senza avviso.
    for (const percorso of campiScartati(dati, esito.data)) {
      const [radiceDelPercorso, indice, ...resto] = percorso
      const elenco = dati[String(radiceDelPercorso)]
      const id = Array.isArray(elenco) && typeof indice === 'number' ? (elenco[indice] as { id?: string })?.id : undefined
      const campo = (id ? resto : [indice, ...resto]).filter((p) => p !== undefined && p !== 'data').join('.')
      problemi.push(
        `[${code}] ${id ? `${String(radiceDelPercorso)}/${id}` : String(radiceDelPercorso)} → ${campo}: ` +
          'campo presente nel CMS ma non nello schema (packages/content/src/schema.ts)',
      )
    }
    for (const problema of riferimentiRotti(dati as Parameters<typeof riferimentiRotti>[0])) problemi.push(`[${code}] ${problema}`)
    if (problemi.length) continue

    conteggi[code] = Object.fromEntries(COLLEZIONI.map((c) => [c, (dati[c] as unknown[]).length]))
    for (const [nome, contenuto] of Object.entries(dati)) await scriviJson(path.join(appoggio, 'dati', code, `${nome}.json`), contenuto)
    console.log(`  ${code}: ${COLLEZIONI.map((c) => `${conteggi[code][c]} ${c}`).join(', ')}`)
  }

  problemi.push(...ctx.errori)
  if (problemi.length) {
    throw new ErroreCms(`I dati del CMS non sono validi:\n${[...new Set(problemi)].map((p) => `  - ${p}`).join('\n')}`)
  }

  // I media si scaricano solo se tutto il resto è a posto, e solo quelli che i contenuti usano.
  const nomiMedia = [...ctx.media.keys()].sort()
  await mkdir(path.join(appoggio, 'media'), { recursive: true })
  for (const nome of nomiMedia) {
    const file = await scaricaFile(cms, nome, ctx.media.get(nome)?.dimensione)
    await writeFile(path.join(appoggio, 'media', nome), file)
  }
  console.log(`  media: ${nomiMedia.length} file`)

  const meta = {
    versione: 1 as const,
    stato: 'ok' as const,
    generatoIl: new Date().toISOString(),
    sorgente: cms,
    lingue: locales.map(({ code }) => code),
    media: nomiMedia,
    conteggi,
  }
  snapshotMeta.parse(meta)
  // meta.json fa parte dei file nuovi (così non viene tolto dalla potatura) ma si copia per ultimo.
  await scriviJson(path.join(appoggio, 'dati', 'meta.json'), meta)

  // --- Scrittura nel posto vero: da qui un'interruzione lascia lo snapshot da rifare. ---
  fase = 'scrittura'
  await scriviJson(path.join(cartellaSnapshot, 'meta.json'), { ...meta, stato: 'in-aggiornamento' })
  await copiaNuovi(path.join(appoggio, 'media'), cartellaMedia)
  await copiaNuovi(path.join(appoggio, 'dati'), cartellaSnapshot, ['meta.json'])
  await potaVecchi(path.join(appoggio, 'media'), cartellaMedia)
  await potaVecchi(path.join(appoggio, 'dati'), cartellaSnapshot)
  await scriviJson(path.join(cartellaSnapshot, 'meta.json'), meta)

  for (const avviso of ctx.avvisi) console.warn(`  attenzione: ${avviso}`)
  console.log(`Fatto in ${((Date.now() - inizio) / 1000).toFixed(1)} s. Snapshot in ${path.relative(radice, cartellaSnapshot)}`)
}

let bloccoPreso = false
try {
  await prendiBlocco()
  bloccoPreso = true
  await aggiorna()
} catch (errore) {
  if (fase === 'scrittura') {
    console.error("\nAggiornamento INTERROTTO A METÀ della copia dei file: lo snapshot può essere incoerente (meta.json ha stato 'in-aggiornamento').")
    console.error('Rilancia npm run contenuti:aggiorna per completarlo.')
  } else {
    console.error('\nAggiornamento NON riuscito: lo snapshot precedente è rimasto invariato.')
  }
  console.error(errore instanceof ErroreCms ? errore.message : errore)
  process.exitCode = 1
} finally {
  // La pulizia non deve cambiare l'esito: un aggiornamento riuscito resta riuscito anche se un file è occupato.
  if (bloccoPreso) {
    await rm(appoggio, { recursive: true, force: true }).catch(() => undefined)
    await rm(fileBlocco, { force: true }).catch(() => undefined)
  }
}
