import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ErroreCms } from './errori'
import { lexicalInHtml } from './html'

// Piccoli costruttori di testo formattato nel formato che restituisce il CMS.
const testo = (t: string, format = 0) => ({ type: 'text', text: t, format, version: 1, mode: 'normal', style: '', detail: 0 })
const lex = (...figli: unknown[]) => ({
  root: { type: 'root', direction: 'ltr', format: '', indent: 0, version: 1, children: figli },
})
const paragrafo = (...figli: unknown[]) => ({
  type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, textFormat: 0, textStyle: '', children: figli,
})
const lista = (tag: 'ul' | 'ol', voci: string[], start: unknown = 1) => ({
  type: 'list', tag, listType: tag === 'ol' ? 'number' : 'bullet', start, version: 1, direction: 'ltr', format: '', indent: 0,
  children: voci.map((t, i) => ({ type: 'listitem', value: i + 1, version: 1, direction: 'ltr', format: '', indent: 0, children: [testo(t)] })),
})

test('paragrafo e grassetto: markup semplice, senza contenitore', () => {
  assert.equal(lexicalInHtml(lex(paragrafo(testo('Ciao '), testo('mondo', 1)))), '<p>Ciao <strong>mondo</strong></p>')
})

test('elenco puntato: <ul><li> senza classi, stili o numeri', () => {
  assert.equal(lexicalInHtml(lex(lista('ul', ['uno', 'due']))), '<ul><li>uno</li><li>due</li></ul>')
})

test('elenco numerato: start solo se è un numero intero diverso da 1', () => {
  assert.equal(lexicalInHtml(lex(lista('ol', ['a']))), '<ol><li>a</li></ol>')
  assert.equal(lexicalInHtml(lex(lista('ol', ['a'], 3))), '<ol start="3"><li>a</li></ol>')
})

test('start non numerico: non finisce nell\'HTML (niente attributi iniettati)', () => {
  const html = lexicalInHtml(lex(lista('ol', ['a'], '2" onmouseover="alert(1)')))
  assert.equal(html, '<ol><li>a</li></ol>')
  assert.ok(!html.includes('onmouseover'))
})

const link = (fields: Record<string, unknown>, t = 'clic') => ({
  type: 'link', version: 1, direction: 'ltr', format: '', indent: 0, fields, children: [testo(t)],
})

test('link: indirizzo ripulito, nuova scheda con rel', () => {
  assert.equal(lexicalInHtml(lex(paragrafo(link({ linkType: 'custom', url: '/chi-siamo?a=1&b=2' })))), '<p><a href="/chi-siamo?a=1&amp;b=2">clic</a></p>')
  assert.equal(
    lexicalInHtml(lex(paragrafo(link({ linkType: 'custom', url: 'https://ok.it', newTab: true })))),
    '<p><a href="https://ok.it" target="_blank" rel="noopener noreferrer">clic</a></p>',
  )
})

test('link con javascript: errore, non un link innocuo nascosto', () => {
  assert.throws(() => lexicalInHtml(lex(paragrafo(link({ linkType: 'custom', url: ' JavaScript:alert(1)' }))), 'news/x'), /news\/x.*link non valido/)
})

test('link a un documento interno: errore, non un "#" silenzioso', () => {
  const interno = link({ linkType: 'internal', doc: { relationTo: 'pages', value: 1 } }, 'x')
  assert.throws(() => lexicalInHtml(lex(paragrafo(interno)), 'pages/home'), (e) => e instanceof ErroreCms && /pages\/home.*documento interno/.test(e.message))
})

test('nodo sconosciuto o blocco: errore', () => {
  assert.throws(() => lexicalInHtml(lex({ type: 'inventato', version: 1 })), /elemento "inventato"/)
  assert.throws(() => lexicalInHtml(lex({ type: 'block', version: 1, fields: { blockType: 'x' } })), /elemento "block"/)
})

test('un testo che contiene "unknown node" non è un errore', () => {
  assert.equal(lexicalInHtml(lex(paragrafo(testo('unknown node')))), '<p>unknown node</p>')
})

test('sottolineato e barrato si ignorano: niente style="" (la CSP lo bloccherebbe)', () => {
  assert.equal(lexicalInHtml(lex(paragrafo(testo('a', 1 | 4 | 8)))), '<p><strong>a</strong></p>')
})

test('un "Titolo 1" diventa h2: il sito ha già un h1 per pagina', () => {
  const titolo = (tag: string) => ({ type: 'heading', tag, version: 1, direction: 'ltr', format: '', indent: 0, children: [testo('T')] })
  assert.equal(lexicalInHtml(lex(titolo('h1'))), '<h2>T</h2>')
  assert.equal(lexicalInHtml(lex(titolo('h3'))), '<h3>T</h3>')
})

test('testo con caratteri HTML: escape', () => {
  assert.equal(lexicalInHtml(lex(paragrafo(testo('<b>"x"</b>')))), '<p>&lt;b&gt;&quot;x&quot;&lt;/b&gt;</p>')
})

test('dopo un errore console.error torna quello vero', () => {
  const originale = console.error
  assert.throws(() => lexicalInHtml(lex({ type: 'inventato', version: 1 })))
  assert.equal(console.error, originale)
})

test('un nodo chiamato come un metodo di Object non trova un convertitore per sbaglio', () => {
  assert.throws(() => lexicalInHtml(lex({ type: 'constructor', version: 1 })), /elemento "constructor"/)
  assert.throws(() => lexicalInHtml(lex({ type: 'toString', version: 1 })), /elemento "toString"/)
})
