// Seed dimostrativo: carica nel CMS i contenuti di esempio della cartella seed/ alla radice.
//
// Si lancia solo a mano (npm run seed): mai in avvio, build o aggiornamento.
// È ripetibile: ogni elemento si riconosce dallo slug, e se esiste già viene saltato per intero,
// anche se l'editor lo ha modificato. Le Impostazioni si compilano solo se sono ancora vuote.
// Ogni elemento (con le sue traduzioni) si scrive in una transazione: se qualcosa va storto non resta a metà.
// Non crea utenti: il primo amministratore si crea dal pannello (in produzione con npm run admin:crea).
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { defaultLocale, locales } from '@brainy/content'
import { convertMarkdownToLexical, type LexicalRichTextAdapter } from '@payloadcms/richtext-lexical'
import { commitTransaction, createLocalReq, getPayload, initTransaction, killTransaction, type PayloadRequest } from 'payload'
import { parse } from 'yaml'

import { rootDir } from '../src/env'
import config from '../src/payload.config'

// Il seed è uno strumento di sviluppo: usa l'API locale con tipi larghi (any) per non dover
// descrivere ogni collezione, perché i dati arrivano da file di testo e non dal codice.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dati = Record<string, any>
type Collezione = 'team' | 'activities' | 'news' | 'pages'
type Globale = 'site' | 'theme' | 'menu' | 'sponsors'
type Contenuto = {
  slug: string
  dati: Dati
  corpo: string
  traduzioni: Record<string, { dati: Dati; corpo: string }>
}

// Una variabile e non un'opzione: "payload run" non passa le opzioni allo script.
if (process.env.NODE_ENV === 'production' && process.env.SEED_FORZA !== '1') {
  console.error('Seed rifiutato: NODE_ENV è "production". Il seed serve per gli esempi, non per i dati veri.')
  console.error('Se è davvero quello che vuoi, rilancia con SEED_FORZA=1.')
  process.exit(1)
}

const seedDir = path.join(rootDir, 'seed')
const altreLingue = locales.map(({ code }) => code).filter((code) => code !== defaultLocale)

const payload = await getPayload({ config })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any
// L'editor del progetto (senza h1, immagini e link interni), non quello di serie di Lexical.
const editorConfig = (payload.config.editor as LexicalRichTextAdapter).editorConfig

/** Esegue la scrittura di un elemento in una transazione: o tutto o niente. */
async function inTransazione(scrivi: (req: PayloadRequest) => Promise<void>) {
  const req = await createLocalReq({}, payload)
  if (!(await initTransaction(req))) throw new Error('Il database non ha aperto una transazione: il seed ne ha bisogno.')
  try {
    await scrivi(req)
    await commitTransaction(req)
  } catch (errore) {
    await killTransaction(req)
    throw errore
  }
}

const destinazione = (() => {
  try {
    const url = new URL(
      process.env.DATABASE_URL ||
        `postgres://x@localhost:${process.env.DB_PORT ?? '5433'}/${process.env.DB_NAME ?? ''}`,
    )
    return `${url.hostname}:${url.port}${url.pathname}`
  } catch {
    return 'database configurato'
  }
})()
console.log(`Seed su ${destinazione} (lingue: ${[defaultLocale, ...altreLingue].join(', ')})\n`)

// --- Conteggio e utilità ----------------------------------------------------------------

const bilancio: Record<string, { creati: number; saltati: number }> = {}
const registra = (area: string, esito: 'creati' | 'saltati') => {
  bilancio[area] ??= { creati: 0, saltati: 0 }
  bilancio[area][esito]++
}

/** Un file JSON del seed, oppure null se non c'è. Un errore di sintassi si segnala con il nome del file. */
const leggiJson = async (file: string): Promise<Dati | null> => {
  let testo: string
  try {
    testo = await readFile(file, 'utf8')
  } catch (errore) {
    if ((errore as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw errore
  }
  try {
    return JSON.parse(testo) as Dati
  } catch (errore) {
    throw new Error(`${path.relative(rootDir, file)} non è un JSON valido: ${(errore as Error).message}`)
  }
}

/** Divide un file Markdown in intestazione YAML e corpo (gestisce anche i fine riga di Windows). */
const leggiMarkdown = async (file: string): Promise<{ dati: Dati; corpo: string }> => {
  const testo = (await readFile(file, 'utf8')).replace(/\r\n/g, '\n')
  const parti = testo.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!parti) throw new Error(`Intestazione YAML mancante in ${file}`)
  let dati: Dati | null
  try {
    dati = parse(parti[1]) as Dati | null
  } catch (errore) {
    throw new Error(`Intestazione YAML non valida in ${path.relative(rootDir, file)}: ${(errore as Error).message}`)
  }
  return { dati: dati ?? {}, corpo: parti[2].trim() }
}

// --- Conversioni -------------------------------------------------------------------------

// Lexical non trasforma le email nude in link (lo fa il Markdown della base): lo facciamo noi.
// Link, autolink <...> e codice `...` già scritti restano come sono: si riconoscono per primi e si saltano.
const linkEmail = (markdown: string): string =>
  markdown.replace(
    /(`[^`]*`|\[[^\]]*\]\([^)]*\)|<[^>\s]+>)|(?<![\w.+\-/:=?&])([a-z0-9][\w.+-]*@[a-z0-9-]+(?:\.[a-z0-9-]*[a-z0-9])+)(?![\w-])/gi,
    (tutto, daLasciare: string | undefined, email: string | undefined) => (daLasciare ? tutto : `[${email}](mailto:${email})`),
  )

const markdownInLexical = (markdown: string) =>
  convertMarkdownToLexical({ editorConfig, markdown: linkEmail(markdown) })

const mediaId = new Map<string, number | string>()

// Campi che nella base contengono un percorso /uploads/... e qui diventano un riferimento a Media.
const CAMPI_MEDIA = new Set(['image', 'file', 'photo', 'cover', 'logo', 'og_image', 'header_image', 'footer_logo'])
// Campi di testo formattato: nella base erano Markdown, qui diventano Lexical.
const CAMPI_TESTO_FORMATTATO = new Set(['content', 'body'])

/**
 * Trasforma i dati della base nel formato del CMS:
 * - /uploads/x -> id del Media; i testi alternativi (*_alt) si tolgono: stanno nel Media;
 * - Markdown -> Lexical; stringhe vuote e null -> campo assente.
 */
const preparaDati = (valore: unknown, chiave = ''): unknown => {
  if (valore === null) return undefined
  if (Array.isArray(valore)) return valore.map((elemento) => preparaDati(elemento, chiave)).filter((e) => e !== undefined)
  if (valore && typeof valore === 'object') {
    const risultato: Dati = {}
    for (const [k, v] of Object.entries(valore)) {
      if (k.endsWith('_alt')) continue
      const preparato = preparaDati(v, k)
      if (preparato !== undefined) risultato[k] = preparato
    }
    return risultato
  }
  if (typeof valore === 'string') {
    if (valore === '') return undefined
    if (CAMPI_MEDIA.has(chiave) && valore.startsWith('/uploads/')) {
      const id = mediaId.get(valore.replace('/uploads/', ''))
      if (id === undefined) throw new Error(`File non trovato in seed/media: ${valore}`)
      return id
    }
    if (CAMPI_TESTO_FORMATTATO.has(chiave)) return markdownInLexical(valore)
  }
  return valore
}

const preparaSezioni = (sezioni: Dati[] = []) =>
  sezioni.map(({ type, ...resto }) => ({ blockType: type, ...(preparaDati(resto) as Dati) }))

/**
 * Sovrappone le traduzioni al documento letto dal CMS. Gli array si uniscono per posizione
 * (la struttura dei blocchi è comune a tutte le lingue) e così i riferimenti e gli id delle righe restano.
 */
const sovrapponi = (base: unknown, traduzione: unknown): unknown => {
  // Una traduzione assente o null lascia il valore com'è (senza, un null cancellerebbe la struttura comune).
  if (traduzione === null || traduzione === undefined) return base
  if (Array.isArray(traduzione)) {
    return (Array.isArray(base) ? base : []).map((elemento, i) =>
      traduzione[i] === undefined ? elemento : sovrapponi(elemento, traduzione[i]),
    )
  }
  // Un testo formattato (ha "root") si sostituisce per intero, non si unisce.
  if (traduzione && typeof traduzione === 'object' && !('root' in traduzione)) {
    const risultato: Dati = { ...(base && typeof base === 'object' ? (base as Dati) : {}) }
    for (const [k, v] of Object.entries(traduzione)) risultato[k] = sovrapponi((risultato as Dati)[k], v)
    return risultato
  }
  return traduzione
}

const SISTEMA = ['id', 'createdAt', 'updatedAt', '_status', 'globalType', 'slug']
const senzaCampiDiSistema = (doc: Dati): Dati =>
  Object.fromEntries(Object.entries(doc).filter(([k]) => !SISTEMA.includes(k)))

// --- Media -------------------------------------------------------------------------------

async function seminaMedia() {
  const dir = path.join(seedDir, 'media')
  const testiAlt = ((await leggiJson(path.join(dir, 'alt.json'))) ?? {}) as Record<string, Record<string, string>>
  const fileDelSeed = (await readdir(dir)).filter((nome) => nome !== 'alt.json').sort()
  for (const file of fileDelSeed) {
    // Si riconosce anche con il suffisso che Payload aggiunge quando il nome è già preso ("logo-1.svg")
    // e con l'estensione che Payload riscrive per le immagini ("foto.jpeg" diventa "foto.jpg"): conta la base.
    const { name: base } = path.parse(file)
    const simili = await api.find({ collection: 'media', where: { filename: { like: base } }, limit: 0, pagination: false, depth: 0 })
    const stessoFile = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-\\d+)?\\.[^.]+$`, 'i')
    // Un nome che è proprio un altro file del seed ("neve-2.svg") non è una copia di questo.
    const altri = new Set(fileDelSeed.filter((f) => f !== file).map((f) => f.toLowerCase()))
    const candidati = (simili.docs as Dati[]).filter((d) => !altri.has(String(d.filename).toLowerCase()))
    const esistente = candidati.find((d) => d.filename === file) ?? candidati.find((d) => stessoFile.test(d.filename))
    if (esistente) {
      mediaId.set(file, esistente.id)
      registra('media', 'saltati')
      console.log(`  = media/${file} (già presente${esistente.filename !== file ? ` come ${esistente.filename}` : ''})`)
      continue
    }
    const alt = testiAlt[file] ?? {}
    await inTransazione(async (req) => {
      const doc = await api.create({
        collection: 'media',
        data: { alt: alt[defaultLocale] },
        filePath: path.join(dir, file),
        locale: defaultLocale,
        // Nessun Media ha questo nome (nemmeno con altre maiuscole): un file uguale nella cartella è rimasto
        // da un database azzerato. Si sovrascrive, invece di creare "logo-1.svg".
        overwriteExistingFiles: true,
        req,
      })
      for (const lingua of altreLingue) {
        if (alt[lingua]) await api.update({ collection: 'media', id: doc.id, locale: lingua, data: { alt: alt[lingua] }, req })
      }
      mediaId.set(file, doc.id)
    })
    registra('media', 'creati')
    console.log(`  + media/${file}`)
  }
}

// --- Collezioni --------------------------------------------------------------------------

async function leggiCollezione(nome: Collezione): Promise<Contenuto[]> {
  const dir = path.join(seedDir, 'content', nome)
  const file = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort()
  const traduzione = new RegExp(`\\.(${altreLingue.join('|')})\\.md$`)
  const contenuti: Contenuto[] = []
  for (const f of file.filter((nomeFile) => !traduzione.test(nomeFile))) {
    const slug = f.replace(/\.md$/, '')
    const { dati, corpo } = await leggiMarkdown(path.join(dir, f))
    const traduzioni: Contenuto['traduzioni'] = {}
    for (const lingua of altreLingue) {
      if (file.includes(`${slug}.${lingua}.md`)) traduzioni[lingua] = await leggiMarkdown(path.join(dir, `${slug}.${lingua}.md`))
    }
    contenuti.push({ slug, dati, corpo, traduzioni })
  }
  return contenuti
}

const trovaPerSlug = async (collection: Collezione, slug: string): Promise<{ id: number | string } | undefined> =>
  (await api.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })).docs[0]

const idDaSlug = async (collection: Collezione, slug: string): Promise<number | string> => {
  const doc = await trovaPerSlug(collection, slug)
  if (!doc) throw new Error(`Riferimento a "${collection}/${slug}" ma l'elemento non esiste`)
  return doc.id
}

async function semina(collection: Collezione, costruisci: (contenuto: Contenuto) => Promise<Dati>) {
  for (const contenuto of await leggiCollezione(collection)) {
    if (await trovaPerSlug(collection, contenuto.slug)) {
      registra(collection, 'saltati')
      console.log(`  = ${collection}/${contenuto.slug} (già presente, non toccato)`)
      continue
    }
    const dati = await costruisci(contenuto)
    await inTransazione(async (req) => {
      const doc = await api.create({ collection, data: { ...dati, slug: contenuto.slug }, locale: defaultLocale, req })
      for (const [lingua, { dati: datiTradotti, corpo }] of Object.entries(contenuto.traduzioni)) {
        // Si rilegge il documento nella lingua, si sovrappongono i testi e si rimanda tutta la struttura.
        const attuale = await api.findByID({ collection, id: doc.id, locale: lingua, fallbackLocale: false, depth: 0, req })
        const tradotto = preparaDati({ ...datiTradotti, ...(corpo ? { body: corpo } : {}) })
        await api.update({ collection, id: doc.id, locale: lingua, data: sovrapponi(senzaCampiDiSistema(attuale), tradotto), req })
      }
    })
    registra(collection, 'creati')
    console.log(`  + ${collection}/${contenuto.slug} (${[defaultLocale, ...Object.keys(contenuto.traduzioni)].join(', ')})`)
  }
}

// --- Impostazioni ------------------------------------------------------------------------

async function seminaGlobale(slug: Globale, vuoto: (globale: Dati) => boolean) {
  const attuale = (await api.findGlobal({ slug, depth: 0 })) as Dati
  if (!vuoto(attuale)) {
    registra('impostazioni', 'saltati')
    console.log(`  = ${slug} (già compilato, non toccato)`)
    return
  }
  const dati = await leggiJson(path.join(seedDir, 'settings', `${slug}.json`))
  if (!dati) throw new Error(`File mancante: seed/settings/${slug}.json`)
  const lingueFatte = [defaultLocale]
  await inTransazione(async (req) => {
    await api.updateGlobal({ slug, data: preparaDati(dati), locale: defaultLocale, req })
    for (const lingua of altreLingue) {
      const tradotto = await leggiJson(path.join(seedDir, 'settings', `${slug}.${lingua}.json`))
      if (!tradotto) continue
      const letto = (await api.findGlobal({ slug, locale: lingua, fallbackLocale: false, depth: 0, req })) as Dati
      await api.updateGlobal({ slug, locale: lingua, data: sovrapponi(senzaCampiDiSistema(letto), preparaDati(tradotto)), req })
      lingueFatte.push(lingua)
    }
  })
  registra('impostazioni', 'creati')
  console.log(`  + ${slug} (${lingueFatte.join(', ')})`)
}

// --- Esecuzione --------------------------------------------------------------------------

try {
  console.log('Media')
  await seminaMedia()

  // L'ordine conta: le attività citano le persone, le news citano le attività.
  console.log('Team')
  await semina('team', async ({ dati }) => preparaDati(dati) as Dati)

  console.log('Attività')
  await semina('activities', async ({ dati }) => {
    const { managers, sections, ...resto } = dati
    return {
      ...(preparaDati(resto) as Dati),
      managers: await Promise.all(((managers ?? []) as string[]).map((slug) => idDaSlug('team', slug))),
      sections: preparaSezioni(sections),
      _status: 'published',
    }
  })

  console.log('News')
  await semina('news', async ({ dati, corpo }) => {
    const { draft, activity, date, ...resto } = dati
    return {
      ...(preparaDati(resto) as Dati),
      date: (date instanceof Date ? date : new Date(String(date))).toISOString(),
      activity: activity ? await idDaSlug('activities', activity) : undefined,
      body: markdownInLexical(corpo),
      _status: draft ? 'draft' : 'published',
    }
  })

  console.log('Pagine')
  await semina('pages', async ({ dati }) => {
    const { sections, ...resto } = dati
    return { ...(preparaDati(resto) as Dati), sections: preparaSezioni(sections), _status: 'published' }
  })

  console.log('Impostazioni')
  await seminaGlobale('site', (g) => !g.name)
  await seminaGlobale('theme', (g) => !g.primary)
  await seminaGlobale('menu', (g) => !g.items?.length)
  await seminaGlobale('sponsors', (g) => !g.items?.length)

  console.log('\nRiepilogo')
  for (const [area, { creati, saltati }] of Object.entries(bilancio)) {
    console.log(`  ${area.padEnd(13)} creati ${creati}, già presenti ${saltati}`)
  }
  process.exit(0)
} catch (errore) {
  console.error('\nSeed interrotto:', errore)
  process.exit(1)
}
