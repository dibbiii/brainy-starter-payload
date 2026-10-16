import assert from 'node:assert/strict'
import { test } from 'node:test'

import { globale, normalizza, nuovoContesto, voce } from './normalizza'

const media = (filename: string, extra: Record<string, unknown> = {}) => ({
  id: 1, filename, mimeType: 'image/png', filesize: 100, alt: null, ...extra,
})

test('media popolato: percorso /media, testo alternativo in "<campo>_alt", file da scaricare', () => {
  const ctx = nuovoContesto()
  const uscita = normalizza({ image: media('montagna.svg', { alt: 'Montagne', filesize: 690 }) }, ctx) as Record<string, unknown>
  assert.deepEqual(uscita, { image: '/media/montagna.svg', image_alt: 'Montagne' })
  assert.deepEqual([...ctx.media], [['montagna.svg', { dimensione: 690 }]])
})

test('un media si riconosce dalla forma anche se il campo ha un nome nuovo', () => {
  const ctx = nuovoContesto()
  const uscita = normalizza({ poster: media('a.png') }, ctx) as Record<string, unknown>
  assert.equal(uscita.poster, '/media/a.png')
  assert.ok(ctx.media.has('a.png'))
})

test('i documenti da scaricare (campo "file") non hanno testo alternativo', () => {
  const uscita = normalizza({ file: media('m.pdf', { alt: 'x', mimeType: 'application/pdf' }) }, nuovoContesto()) as Record<string, unknown>
  assert.deepEqual(uscita, { file: '/media/m.pdf' })
})

test('nome file con #, spazi e parentesi: indirizzo codificato, file con il nome vero', () => {
  const ctx = nuovoContesto()
  const uscita = normalizza({ file: media('Gara #2 (estate).pdf') }, ctx) as Record<string, unknown>
  assert.equal(uscita.file, '/media/Gara%20%232%20(estate).pdf')
  assert.ok(ctx.media.has('Gara #2 (estate).pdf'))
})

test('due media che differiscono solo per le maiuscole: errore', () => {
  const ctx = nuovoContesto()
  ctx.dove = 'pages/home'
  normalizza({ a: media('Foto.png'), b: media('foto.png') }, ctx)
  assert.equal(ctx.errori.length, 1)
  assert.match(ctx.errori[0], /pages\/home.*Foto\.png.*foto\.png/)
})

test('lo stesso file usato due volte non è una collisione', () => {
  const ctx = nuovoContesto()
  normalizza({ a: media('Foto.png'), b: media('Foto.png') }, ctx)
  assert.deepEqual(ctx.errori, [])
})

test('nome file con percorso: errore', () => {
  const ctx = nuovoContesto()
  const uscita = normalizza({ image: media('a/b.png') }, ctx) as Record<string, unknown>
  assert.equal(ctx.errori.length, 1)
  assert.equal(uscita.image, undefined)
  assert.equal(ctx.media.size, 0)
})

test('media non leggibile (solo l\'id): omesso con un avviso', () => {
  const ctx = nuovoContesto()
  ctx.dove = 'news/x'
  const uscita = normalizza({ cover: 42, title: 'T' }, ctx) as Record<string, unknown>
  assert.deepEqual(uscita, { title: 'T' })
  assert.equal(ctx.avvisi.size, 1)
})

test('blockType diventa type; campi di sistema, null e testi vuoti spariscono', () => {
  const uscita = normalizza(
    { id: 'x', blockType: 'hero', blockName: null, createdAt: 'a', _status: 'published', title: 'T', subtitle: '', intro: null, size: 'large' },
    nuovoContesto(),
  )
  assert.deepEqual(uscita, { type: 'hero', title: 'T', size: 'large' })
})

test('false e 0 sono valori veri e restano', () => {
  assert.deepEqual(normalizza({ a: false, b: 0 }, nuovoContesto()), { a: false, b: 0 })
})

test('voce(): lo slug è l\'id e i collegamenti diventano slug', () => {
  const ctx = nuovoContesto()
  const v = voce(
    'activities',
    { slug: 'orienteering', title: 'O', managers: [{ slug: 'elena-verdi', name: 'E' }, { slug: 'luca-neri' }] },
    ctx,
    { managers: 'molti' },
  )
  assert.deepEqual(v, { id: 'orienteering', data: { title: 'O', managers: ['elena-verdi', 'luca-neri'] } })
})

test('voce(): un collegamento non leggibile (id grezzo) si omette con un avviso', () => {
  const ctx = nuovoContesto()
  const v = voce('news', { slug: 'n', title: 'N', activity: 7 }, ctx, { activity: 'uno' })
  assert.deepEqual(v.data, { title: 'N' })
  assert.equal(ctx.avvisi.size, 1)
})

test('voce(): senza slug è un errore', () => {
  assert.throws(() => voce('pages', { title: 'x' }, nuovoContesto()), /senza slug/)
})

test('lo stesso avviso non si ripete', () => {
  const ctx = nuovoContesto()
  ctx.dove = 'pages/home'
  normalizza({ image: 1 }, ctx)
  normalizza({ image: 1 }, ctx)
  assert.equal(ctx.avvisi.size, 1)
})

test('globale(): normalizza un\'impostazione', () => {
  const uscita = globale('site', { globalType: 'site', id: 1, name: 'ASD', logo: media('l.png', { alt: 'Logo' }) }, nuovoContesto())
  assert.deepEqual(uscita, { name: 'ASD', logo: '/media/l.png', logo_alt: 'Logo' })
})
