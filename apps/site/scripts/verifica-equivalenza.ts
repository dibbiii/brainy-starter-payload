// Verifica che lo snapshot (in italiano) coincida con i contenuti originali della base, che stanno in seed/.
//
// Uso: npm run verifica:equivalenza   (dopo aver caricato il seed e aggiornato i contenuti)
//
// Per ogni pagina, attività, news, persona e impostazione porta il contenuto originale alla forma dello
// snapshot (percorsi /media, Markdown convertito in HTML con `marked` come faceva il sito, niente *_alt:
// il testo alternativo ora viene dal Media) e lo confronta con quello prodotto dal CMS.
// Il confronto ignora gli spazi nell'HTML e i valori predefiniti che Payload salva (false, elenchi vuoti).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import {
  activityData,
  defaultLocale,
  locales,
  menuData,
  newsData,
  pageData,
  siteData,
  snapshotMeta,
  sponsorsData,
  teamData,
  themeData,
} from '@brainy/content'
import { marked } from 'marked'
import { parse } from 'yaml'

const radice = path.resolve(import.meta.dirname, '../../..')
const cartellaSnapshot = path.join(radice, 'apps/site/.snapshot')
const snapshot = path.join(cartellaSnapshot, defaultLocale)
const seed = path.join(radice, 'seed')

let fallite = 0
const esito = (riuscito: boolean, messaggio: string, dettaglio = '') => {
  if (!riuscito) fallite++
  console.log(`${riuscito ? 'OK  ' : 'FAIL'} ${messaggio}${dettaglio}`)
}

const leggiJson = (file: string) => JSON.parse(readFileSync(file, 'utf8'))

// Uno snapshot rimasto a metà non va confrontato: i file potrebbero essere di due aggiornamenti diversi.
const fileMeta = path.join(cartellaSnapshot, 'meta.json')
const meta = snapshotMeta.safeParse(existsSync(fileMeta) ? leggiJson(fileMeta) : undefined)
esito(meta.success && meta.data.stato === 'ok', 'meta.json valido e con stato "ok"', meta.success ? ` (${meta.data.stato})` : '')
if (!meta.success || meta.data.stato !== 'ok') {
  console.log('\nRilancia npm run contenuti:aggiorna prima della verifica.')
  process.exit(1)
}

// I file tradotti del seed hanno il codice della lingua prima di ".md" (es. chi-siamo.en.md).
const traduzione = new RegExp(`\\.(${locales.filter((l) => l.code !== defaultLocale).map((l) => l.code).join('|')})\\.md$`)
const markdownInHtml = (testo: string) => marked.parse(testo, { async: false }) as string
const normalizzaHtml = (html: string) => html.replace(/\s+/g, ' ').replace(/> </g, '><').trim()
const tondo = <T>(valore: T): T => JSON.parse(JSON.stringify(valore))

const CAMPI_TESTO_FORMATTATO = new Set(['content', 'body'])

/** Porta un contenuto della base alla forma dello snapshot. */
const comeSnapshot = (valore: unknown, chiave = ''): unknown => {
  if (Array.isArray(valore)) return valore.map((v) => comeSnapshot(v, chiave))
  if (valore && typeof valore === 'object') {
    return Object.fromEntries(
      Object.entries(valore).filter(([k]) => !k.endsWith('_alt')).map(([k, v]) => [k, comeSnapshot(v, k)]),
    )
  }
  if (typeof valore === 'string') {
    if (CAMPI_TESTO_FORMATTATO.has(chiave)) return normalizzaHtml(markdownInHtml(valore))
    return valore.replace(/^\/uploads\//, '/media/')
  }
  return valore
}

/** Lo stesso per i dati dello snapshot: niente *_alt, HTML senza spazi in più, percorsi decodificati. */
const dalloSnapshot = (valore: unknown, chiave = ''): unknown => {
  if (Array.isArray(valore)) return valore.map((v) => dalloSnapshot(v, chiave))
  if (valore && typeof valore === 'object') {
    return Object.fromEntries(
      Object.entries(valore).filter(([k]) => !k.endsWith('_alt')).map(([k, v]) => [k, dalloSnapshot(v, k)]),
    )
  }
  if (typeof valore === 'string') {
    if (CAMPI_TESTO_FORMATTATO.has(chiave)) return normalizzaHtml(valore)
    return valore.startsWith('/media/') ? decodeURIComponent(valore) : valore
  }
  return valore
}

// Payload salva i valori predefiniti (false, elenchi vuoti) dove nel file della base il campo mancava.
const senzaPredefiniti = (valore: unknown): unknown => {
  if (Array.isArray(valore)) return valore.map(senzaPredefiniti)
  if (valore && typeof valore === 'object') {
    return Object.fromEntries(
      Object.entries(valore)
        .filter(([, v]) => v !== false && !(Array.isArray(v) && v.length === 0))
        .map(([k, v]) => [k, senzaPredefiniti(v)]),
    )
  }
  return valore
}

const differenze = (a: unknown, b: unknown, percorso = ''): string[] => {
  if (isDeepStrictEqual(a, b)) return []
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const chiavi = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...chiavi].flatMap((k) =>
      differenze((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${percorso}.${k}`),
    )
  }
  return [`${percorso}: base=${JSON.stringify(a)?.slice(0, 120)} | snapshot=${JSON.stringify(b)?.slice(0, 120)}`]
}

const leggiMarkdown = (file: string) => {
  const testo = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const parti = testo.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!parti) throw new Error(`Intestazione YAML mancante in ${file}`)
  return { dati: (parse(parti[1]) ?? {}) as Record<string, unknown>, corpo: parti[2].trim() }
}

const collezioni = { pages: pageData, activities: activityData, news: newsData, team: teamData } as const
for (const [nome, schema] of Object.entries(collezioni)) {
  const cartella = path.join(seed, 'content', nome)
  const slug = readdirSync(cartella)
    .filter((f) => f.endsWith('.md') && !traduzione.test(f))
    .map((f) => f.replace(/\.md$/, ''))
  const voci = leggiJson(path.join(snapshot, `${nome}.json`)) as { id: string; data: unknown }[]
  esito(
    voci.length === slug.length && slug.every((s) => voci.some((v) => v.id === s)),
    `${nome}: stessi elementi della base`,
    ` (${voci.length})`,
  )
  for (const s of slug) {
    const { dati, corpo } = leggiMarkdown(path.join(cartella, `${s}.md`))
    if (nome === 'news') {
      dati.body = corpo
      delete dati.draft
    }
    const atteso = tondo(schema.parse(comeSnapshot(dati))) as Record<string, unknown>
    const trovato = tondo(schema.parse(dalloSnapshot(voci.find((v) => v.id === s)?.data))) as Record<string, unknown>
    if (nome === 'news') {
      delete atteso.draft
      delete trovato.draft
    }
    const d = differenze(atteso, trovato)
    esito(d.length === 0, `${nome}/${s} uguale alla base`, d.length ? `\n      ${d.slice(0, 6).join('\n      ')}` : '')
  }
}

const impostazioni = { site: siteData, theme: themeData, menu: menuData, sponsors: sponsorsData } as const
for (const [nome, schema] of Object.entries(impostazioni)) {
  const base = leggiJson(path.join(seed, 'settings', `${nome}.json`))
  const atteso = senzaPredefiniti(tondo(schema.parse(comeSnapshot(base))))
  const trovato = senzaPredefiniti(tondo(schema.parse(dalloSnapshot(leggiJson(path.join(snapshot, `${nome}.json`))))))
  const d = differenze(atteso, trovato)
  esito(d.length === 0, `impostazioni/${nome} uguali alla base`, d.length ? `\n      ${d.slice(0, 6).join('\n      ')}` : '')
}

console.log(fallite ? `\nDIFFERENZE TROVATE: ${fallite}` : '\nLo snapshot coincide con i contenuti della base.')
process.exitCode = fallite ? 1 : 0
