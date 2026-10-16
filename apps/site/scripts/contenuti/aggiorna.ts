// Il cuore di "contenuti:aggiorna": legge il CMS, valida, scarica i media e scrive lo snapshot.
// I percorsi e le funzioni di lettura arrivano da fuori, così i test lo provano su cartelle temporanee.
//
// Due fasi:
// - PREPARAZIONE: si legge, si valida e si scarica tutto in una cartella di appoggio. Se qualcosa non va
//   non si tocca niente: lo snapshot precedente resta com'è.
// - SCRITTURA: si copiano i file nel posto vero. Se si interrompe qui, meta.json resta con stato
//   "in-aggiornamento" e basta rilanciare il comando.
import { mkdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { defaultLocale, locales, snapshotLingua, snapshotMeta } from '@brainy/content'

import { campiScartati, riferimentiRotti } from './controlli'
import { ErroreCms } from './errori'
import { globale, nuovoContesto, voce } from './normalizza'
import { leggiCollezione, leggiGlobale, scaricaFile, verificaChiave, type Accesso } from './rest'
import { copiaNuovi, potaVecchi, scriviJson } from './scrivi'

export type Fase = 'preparazione' | 'scrittura'
export type Cartelle = { snapshot: string; media: string; appoggio: string; blocco: string }
export type Lettura = {
  leggiCollezione: typeof leggiCollezione
  leggiGlobale: typeof leggiGlobale
  scaricaFile: typeof scaricaFile
  verificaChiave: typeof verificaChiave
}

export type Opzioni = {
  accesso: Accesso
  perPagina: number
  cartelle: Cartelle
  /** Si aggiorna man mano: chi gestisce Ctrl+C sa così in che fase si è fermato. */
  stato: { fase: Fase }
  lettura?: Lettura
  log?: Pick<Console, 'log' | 'warn'>
}

const COLLEZIONI = ['pages', 'activities', 'news', 'team'] as const
const IMPOSTAZIONI = ['site', 'theme', 'menu', 'sponsors'] as const
// Collegamenti tra contenuti: diventano slug (come gli id della base).
const COLLEGAMENTI: Record<string, Record<string, 'uno' | 'molti'>> = {
  activities: { managers: 'molti' },
  news: { activity: 'uno' },
}

/** Un processo esiste ancora? (EPERM: esiste, ma è di un altro utente.) */
const processoVivo = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (errore) {
    return (errore as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Impedisce due aggiornamenti insieme: si cancellerebbero a vicenda la cartella di appoggio.
 * Un blocco lasciato da un processo che non c'è più (chiuso di colpo) si riconosce dal PID e si toglie.
 */
export async function prendiBlocco(file: string, log: Pick<Console, 'warn'> = console): Promise<void> {
  const crea = async () => {
    try {
      await writeFile(file, String(process.pid), { flag: 'wx' })
      return true
    } catch (errore) {
      if ((errore as NodeJS.ErrnoException).code === 'EEXIST') return false
      throw errore
    }
  }
  if (await crea()) return
  const pid = Number((await readFile(file, 'utf8').catch(() => '')).trim())
  if (Number.isInteger(pid) && pid > 0 && processoVivo(pid)) {
    throw new ErroreCms(`Un altro aggiornamento è in corso (processo ${pid}). Se non è vero, cancella ${file}.`)
  }
  // Un blocco senza PID appena creato è di un processo che non l'ha ancora scritto: non è orfano.
  const eta = Date.now() - ((await stat(file).catch(() => undefined))?.mtimeMs ?? 0)
  if (!pid && eta < 10_000) throw new ErroreCms(`Un altro aggiornamento è appena partito. Se non è vero, cancella ${file}.`)
  log.warn(`Tolgo il blocco lasciato da un aggiornamento interrotto${pid ? ` (processo ${pid}, non più attivo)` : ''}.`)
  await unlink(file).catch(() => undefined)
  // Se nel frattempo un altro processo l'ha preso, vince lui.
  if (!(await crea())) throw new ErroreCms(`Un altro aggiornamento è appena partito. Se non è vero, cancella ${file}.`)
}

/** Avvisa se l'ultimo aggiornamento si era fermato a metà della scrittura (o meta.json è illeggibile). */
async function controllaSnapshotPrecedente(cartella: string, log: Pick<Console, 'warn'>) {
  let testo: string
  try {
    testo = await readFile(path.join(cartella, 'meta.json'), 'utf8')
  } catch (errore) {
    if ((errore as NodeJS.ErrnoException).code === 'ENOENT') return
    throw errore
  }
  let meta
  try {
    meta = snapshotMeta.safeParse(JSON.parse(testo))
  } catch {
    meta = undefined
  }
  if (!meta?.success) log.warn('meta.json dello snapshot attuale non è valido: lo snapshot viene rifatto da capo.')
  else if (meta.data.stato !== 'ok') log.warn("L'ultimo aggiornamento si era interrotto a metà: lo snapshot viene completato ora.")
}

// Il punto del dato che non va, come lo vede l'editor: "news/gara → body" (senza il contenitore "data").
function descriviPercorso(dati: Record<string, unknown>, percorso: PropertyKey[]) {
  const [radice, indice, ...resto] = percorso
  const elenco = dati[String(radice)]
  const id = Array.isArray(elenco) && typeof indice === 'number' ? (elenco[indice] as { id?: string })?.id : undefined
  const campo = (id ? resto : [indice, ...resto]).filter((p) => p !== undefined && p !== 'data').map(String).join('.')
  return `${id ? `${String(radice)}/${id}` : String(radice)}${campo ? ` → ${campo}` : ''}`
}

export async function aggiorna({ accesso, perPagina, cartelle, stato, lettura, log = console }: Opzioni): Promise<void> {
  const leggi = lettura ?? { leggiCollezione, leggiGlobale, scaricaFile, verificaChiave }
  const inizio = Date.now()
  log.log(`Aggiorno i contenuti da ${accesso.cms}`)
  await controllaSnapshotPrecedente(cartelle.snapshot, log)
  await leggi.verificaChiave(accesso)

  await rm(cartelle.appoggio, { recursive: true, force: true })
  await mkdir(cartelle.appoggio, { recursive: true })

  const ctx = nuovoContesto()
  if (!accesso.chiave) ctx.avvisi.add('senza CMS_API_KEY le email del Team non si leggono (crea la chiave con npm run chiave:snapshot).')
  try {
    const problemi: string[] = []
    const conteggi: Record<string, Record<string, number>> = {}

    for (const { code } of locales) {
      // Le traduzioni mancanti ripiegano sulla lingua predefinita: ogni lingua è completa.
      const parametri = `locale=${code}&fallback-locale=${defaultLocale}`
      const dati: Record<string, unknown> = {}
      for (const collezione of COLLEZIONI) {
        const documenti = (await leggi.leggiCollezione(accesso, collezione, parametri, perPagina)) as Record<string, unknown>[]
        dati[collezione] = documenti.map((d) => voce(collezione, d, ctx, COLLEGAMENTI[collezione]))
      }
      for (const nome of IMPOSTAZIONI) dati[nome] = globale(nome, await leggi.leggiGlobale(accesso, nome, parametri), ctx)

      // La validazione dice quale contenuto e quale campo non vanno, non solo "dati non validi".
      const esito = snapshotLingua.safeParse(dati)
      if (!esito.success) {
        for (const problema of esito.error.issues) problemi.push(`[${code}] ${descriviPercorso(dati, problema.path)}: ${problema.message}`)
        continue
      }
      // Lo schema scarta in silenzio i campi che non conosce: un campo aggiunto al CMS e dimenticato
      // in packages/content/src/schema.ts sparirebbe dal sito senza avviso.
      for (const percorso of campiScartati(dati, esito.data)) {
        problemi.push(`[${code}] ${descriviPercorso(dati, percorso)}: campo presente nel CMS ma non nello schema (packages/content/src/schema.ts)`)
      }
      for (const problema of riferimentiRotti(dati as Parameters<typeof riferimentiRotti>[0])) problemi.push(`[${code}] ${problema}`)
      if (problemi.length) continue

      conteggi[code] = Object.fromEntries(COLLEZIONI.map((c) => [c, (dati[c] as unknown[]).length]))
      for (const [nome, contenuto] of Object.entries(dati)) await scriviJson(path.join(cartelle.appoggio, 'dati', code, `${nome}.json`), contenuto)
      log.log(`  ${code}: ${COLLEZIONI.map((c) => `${conteggi[code][c]} ${c}`).join(', ')}`)
    }

    problemi.push(...ctx.errori)
    if (problemi.length) throw new ErroreCms(`I dati del CMS non sono validi:\n${[...new Set(problemi)].map((p) => `  - ${p}`).join('\n')}`)

    // I media si scaricano solo se tutto il resto è a posto, e solo quelli che i contenuti usano.
    const nomiMedia = [...ctx.media.keys()].sort()
    await mkdir(path.join(cartelle.appoggio, 'media'), { recursive: true })
    for (const nome of nomiMedia) {
      await writeFile(path.join(cartelle.appoggio, 'media', nome), await leggi.scaricaFile(accesso, nome, ctx.media.get(nome)?.dimensione))
    }
    log.log(`  media: ${nomiMedia.length} file`)

    const meta = snapshotMeta.parse({
      versione: 1,
      stato: 'ok',
      generatoIl: new Date().toISOString(),
      sorgente: accesso.cms,
      lingue: locales.map(({ code }) => code),
      media: nomiMedia,
      conteggi,
    })
    // meta.json fa parte dei file nuovi (così non viene tolto dalla potatura) ma si copia per ultimo.
    await scriviJson(path.join(cartelle.appoggio, 'dati', 'meta.json'), meta)

    // --- Scrittura nel posto vero: da qui un'interruzione lascia lo snapshot da rifare. ---
    stato.fase = 'scrittura'
    await scriviJson(path.join(cartelle.snapshot, 'meta.json'), { ...meta, stato: 'in-aggiornamento' })
    await copiaNuovi(path.join(cartelle.appoggio, 'media'), cartelle.media)
    await copiaNuovi(path.join(cartelle.appoggio, 'dati'), cartelle.snapshot, ['meta.json'])
    await potaVecchi(path.join(cartelle.appoggio, 'media'), cartelle.media)
    await potaVecchi(path.join(cartelle.appoggio, 'dati'), cartelle.snapshot)
    await scriviJson(path.join(cartelle.snapshot, 'meta.json'), meta)
    log.log(`Fatto in ${((Date.now() - inizio) / 1000).toFixed(1)} s.`)
  } finally {
    // Gli avvisi servono anche quando l'aggiornamento non riesce (es. un collegamento omesso che spiega l'errore).
    for (const avviso of ctx.avvisi) log.warn(`  attenzione: ${avviso}`)
  }
}
