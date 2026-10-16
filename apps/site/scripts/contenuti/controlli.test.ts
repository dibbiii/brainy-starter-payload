import assert from 'node:assert/strict'
import { test } from 'node:test'

import { campiScartati, riferimentiRotti } from './controlli'

test('campiScartati: segnala i campi che lo schema ha tolto, anche dentro gli array', () => {
  const grezzo = { pages: [{ id: 'home', data: { title: 'T', nuovo: 1, sections: [{ type: 'hero', extra: true }] } }] }
  const validato = { pages: [{ id: 'home', data: { title: 'T', sections: [{ type: 'hero' }] } }] }
  assert.deepEqual(campiScartati(grezzo, validato), [
    ['pages', 0, 'data', 'nuovo'],
    ['pages', 0, 'data', 'sections', 0, 'extra'],
  ])
})

test('campiScartati: niente da segnalare se i dati coincidono', () => {
  const dati = { a: { b: [1, 2], c: 'x' } }
  assert.deepEqual(campiScartati(dati, structuredClone(dati)), [])
})

const voce = (id: string, data: object) => ({ id, data })

test('riferimentiRotti: attività o persone citate ma assenti', () => {
  const problemi = riferimentiRotti({
    team: [voce('giulia', {})],
    activities: [voce('sci', { managers: ['giulia', 'fantasma'] })],
    news: [voce('n1', { activity: 'sci' }), voce('n2', { activity: 'assente' }), voce('n3', {})],
  })
  assert.equal(problemi.length, 2)
  assert.match(problemi[0], /activities\/sci.*fantasma/)
  assert.match(problemi[1], /news\/n2.*assente/)
})
