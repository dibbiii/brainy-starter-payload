import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, test } from 'node:test'

import { aggiorna, prendiBlocco, type Cartelle, type Fase, type Lettura } from './aggiorna'
import { ErroreCms } from './errori'

// Un CMS finto con una pagina e un'immagine: ogni test ne cambia un pezzo.
const sitoValido = { name: 'Prova', url: 'https://prova.it' }
const tema = { primary: '#000000', accent: '#111111', ink: '#222222', paper: '#ffffff', heading_font: 'barlow', body_font: 'source', corners: 'square' }
const immagine = { id: 9, filename: 'a.png', mimeType: 'image/png', filesize: 3, alt: 'Una' }

const lettura = (modifiche: { site?: unknown; pagina?: Record<string, unknown>; file?: () => Buffer } = {}): Lettura => ({
  leggiCollezione: async (_accesso, collezione) =>
    collezione === 'pages' ? [{ id: 1, slug: 'home', title: 'Home', header_image: immagine, ...modifiche.pagina }] : [],
  leggiGlobale: async (_accesso, nome) =>
    ({ site: modifiche.site ?? sitoValido, theme: tema, menu: { items: [] }, sponsors: { items: [] } })[nome],
  scaricaFile: async () => (modifiche.file ?? (() => Buffer.from('abc')))(),
  verificaChiave: async () => undefined,
})

let base = ''
let cartelle: Cartelle
let avvisi: string[]
const log = { log: () => undefined, warn: (m: string) => void avvisi.push(m) }
const esegui = (l: Lettura, stato = { fase: 'preparazione' as Fase }) =>
  aggiorna({ accesso: { cms: 'http://cms.test' }, perPagina: 10, cartelle, stato, lettura: l, log })
const leggiMeta = async () => JSON.parse(await readFile(path.join(cartelle.snapshot, 'meta.json'), 'utf8'))

beforeEach(async () => {
  base = await mkdtemp(path.join(tmpdir(), 'snapshot-'))
  cartelle = {
    snapshot: path.join(base, '.snapshot'),
    media: path.join(base, 'media'),
    appoggio: path.join(base, '.snapshot.nuovo'),
    blocco: path.join(base, '.snapshot.lock'),
  }
  avvisi = []
})
afterEach(async () => {
  await rm(base, { recursive: true, force: true })
})

// Uno snapshot "vecchio", per vedere se viene toccato.
const snapshotPrecedente = async () => {
  await mkdir(path.join(cartelle.snapshot, 'it'), { recursive: true })
  await mkdir(cartelle.media, { recursive: true })
  await writeFile(path.join(cartelle.snapshot, 'meta.json'), '{"vecchio":true}')
  await writeFile(path.join(cartelle.media, 'vecchio.png'), 'x')
}

test('riuscito: dati per ogni lingua, media scaricati, vecchi file tolti, meta "ok"', async () => {
  await snapshotPrecedente()
  const stato = { fase: 'preparazione' as Fase }
  await esegui(lettura(), stato)
  const meta = await leggiMeta()
  assert.equal(meta.stato, 'ok')
  assert.deepEqual(meta.media, ['a.png'])
  for (const lingua of meta.lingue) assert.ok(existsSync(path.join(cartelle.snapshot, lingua, 'pages.json')), lingua)
  assert.equal(await readFile(path.join(cartelle.media, 'a.png'), 'utf8'), 'abc')
  assert.ok(!existsSync(path.join(cartelle.media, 'vecchio.png')))
  assert.equal(stato.fase, 'scrittura')
})

test('dati non validi: errore con il punto preciso, snapshot precedente intatto', async () => {
  await snapshotPrecedente()
  await assert.rejects(() => esegui(lettura({ site: { url: 'x' } })), (e) => e instanceof ErroreCms && /\[it\] site → name/.test(e.message))
  assert.deepEqual(await leggiMeta(), { vecchio: true })
  assert.ok(existsSync(path.join(cartelle.media, 'vecchio.png')))
})

test('media che non si scarica: snapshot precedente intatto', async () => {
  await snapshotPrecedente()
  const file = () => {
    throw new ErroreCms('rete giù')
  }
  await assert.rejects(() => esegui(lettura({ file })), /rete giù/)
  assert.deepEqual(await leggiMeta(), { vecchio: true })
})

test('interruzione durante la scrittura: meta resta "in-aggiornamento"', async () => {
  // La cartella dei media è un file: la copia fallisce dopo che meta.json è stato segnato.
  await writeFile(cartelle.media, 'non sono una cartella')
  const stato = { fase: 'preparazione' as Fase }
  await assert.rejects(() => esegui(lettura(), stato))
  assert.equal(stato.fase, 'scrittura')
  assert.equal((await leggiMeta()).stato, 'in-aggiornamento')
})

test('gli avvisi si stampano anche quando l\'aggiornamento non riesce', async () => {
  await assert.rejects(() => esegui(lettura({ site: { url: 'x' }, pagina: { header_image: 12 } })))
  assert.ok(avvisi.some((a) => /header_image.*non si può leggere/.test(a)), avvisi.join('\n'))
})

test('senza chiave si avvisa che le email del Team mancano', async () => {
  await esegui(lettura())
  assert.ok(avvisi.some((a) => /CMS_API_KEY/.test(a)))
})

test('ultimo aggiornamento interrotto a metà: si avvisa e si completa', async () => {
  await mkdir(cartelle.snapshot, { recursive: true })
  await writeFile(
    path.join(cartelle.snapshot, 'meta.json'),
    JSON.stringify({ versione: 1, stato: 'in-aggiornamento', generatoIl: '', sorgente: '', lingue: [], media: [], conteggi: {} }),
  )
  await esegui(lettura())
  assert.ok(avvisi.some((a) => /interrotto a metà/.test(a)))
  assert.equal((await leggiMeta()).stato, 'ok')
})

test('blocco: lasciato da un processo che non c\'è più -> si toglie; di un processo vivo -> errore', async () => {
  await writeFile(cartelle.blocco, '999999999')
  await prendiBlocco(cartelle.blocco, log)
  assert.equal(await readFile(cartelle.blocco, 'utf8'), String(process.pid))
  assert.ok(avvisi.some((a) => /non più attivo/.test(a)))
  await assert.rejects(() => prendiBlocco(cartelle.blocco, log), /in corso \(processo/)
})

test('blocco vuoto appena creato: è di un processo che sta partendo, non si toglie', async () => {
  await writeFile(cartelle.blocco, '')
  await assert.rejects(() => prendiBlocco(cartelle.blocco, log), /appena partito/)
  assert.ok(existsSync(cartelle.blocco))
})
