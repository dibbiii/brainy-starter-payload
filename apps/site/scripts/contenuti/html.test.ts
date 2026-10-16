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

test('link con javascript: viene reso innocuo da Payload', () => {
  const link = { type: 'link', version: 1, direction: 'ltr', format: '', indent: 0, fields: { linkType: 'custom', url: 'javascript:alert(1)' }, children: [testo('clic')] }
  const html = lexicalInHtml(lex(paragrafo(link)))
  assert.ok(!html.includes('javascript:'), html)
})

test('link a un documento interno: errore, non un "#" silenzioso', () => {
  const link = { type: 'link', version: 1, direction: 'ltr', format: '', indent: 0, fields: { linkType: 'internal', doc: { relationTo: 'pages', value: 1 } }, children: [testo('x')] }
  assert.throws(() => lexicalInHtml(lex(paragrafo(link)), 'pages/home'), (e) => e instanceof ErroreCms && /pages\/home/.test(e.message))
})

test('nodo sconosciuto: errore, non "<span>unknown node</span>"', () => {
  assert.throws(() => lexicalInHtml(lex({ type: 'inventato', version: 1 })), ErroreCms)
})

test('dopo un errore console.error torna quello vero', () => {
  const originale = console.error
  assert.throws(() => lexicalInHtml(lex({ type: 'inventato', version: 1 })))
  assert.equal(console.error, originale)
})
