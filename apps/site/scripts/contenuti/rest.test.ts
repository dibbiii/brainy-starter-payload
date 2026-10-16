import assert from 'node:assert/strict'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'

import { ErroreCms } from './errori'
import { leggiCollezione, scaricaFile } from './rest'

// Un finto CMS: ogni test imposta come deve rispondere.
type Gestore = (richiesta: IncomingMessage, risposta: ServerResponse) => void
let gestore: Gestore = () => undefined
let richieste: string[] = []
let server: Server
let cms = ''

before(async () => {
  server = createServer((richiesta, risposta) => {
    richieste.push(richiesta.url ?? '')
    gestore(richiesta, risposta)
  })
  await new Promise<void>((risolvi) => server.listen(0, '127.0.0.1', risolvi))
  cms = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
after(() => {
  server.close()
})

const json = (risposta: ServerResponse, corpo: unknown, stato = 200) => {
  risposta.writeHead(stato, { 'Content-Type': 'application/json' })
  risposta.end(JSON.stringify(corpo))
}

// Un finto elenco di `n` documenti con la paginazione di Payload.
const paginaDi = (n: number, totale = n) => (richiesta: IncomingMessage, risposta: ServerResponse) => {
  const url = new URL(richiesta.url ?? '', 'http://x')
  const limite = Number(url.searchParams.get('limit'))
  const pagina = Number(url.searchParams.get('page'))
  const tutti = Array.from({ length: n }, (_, i) => ({ slug: `doc-${String(i).padStart(2, '0')}` }))
  const docs = tutti.slice((pagina - 1) * limite, pagina * limite)
  json(risposta, { docs, hasNextPage: pagina * limite < n, totalDocs: totale })
}

test('leggiCollezione: scorre tutte le pagine', async () => {
  richieste = []
  gestore = paginaDi(5)
  const documenti = await leggiCollezione(cms, 'news', 'locale=it', 2)
  assert.equal(documenti.length, 5)
  assert.equal(richieste.length, 3)
  assert.ok(richieste[0].includes('limit=2') && richieste[0].includes('sort=slug') && richieste[0].includes('locale=it'))
})

test('leggiCollezione: il totale cambia durante la lettura -> errore, non dati incoerenti', async () => {
  let chiamate = 0
  gestore = (richiesta, risposta) => {
    chiamate++
    json(risposta, { docs: [{ slug: `a${chiamate}` }], hasNextPage: chiamate < 2, totalDocs: chiamate === 1 ? 2 : 1 })
  }
  await assert.rejects(() => leggiCollezione(cms, 'news', '', 1), /cambiati durante la lettura/)
})

test('leggiCollezione: il numero di documenti non torna con il totale -> errore', async () => {
  gestore = paginaDi(3, 4)
  await assert.rejects(() => leggiCollezione(cms, 'news', '', 10), /dichiara 4 documenti ma ne sono arrivati 3/)
})

test('leggiCollezione: slug ripetuto -> errore', async () => {
  gestore = (richiesta, risposta) => json(risposta, { docs: [{ slug: 'x' }, { slug: 'x' }], hasNextPage: false, totalDocs: 2 })
  await assert.rejects(() => leggiCollezione(cms, 'news', '', 10), /stesso slug/)
})

test('un errore 404 non si riprova', async () => {
  richieste = []
  gestore = (richiesta, risposta) => json(risposta, {}, 404)
  await assert.rejects(() => leggiCollezione(cms, 'news', '', 10), /HTTP 404/)
  assert.equal(richieste.length, 1)
})

test('un errore 500 momentaneo si riprova e poi va', async () => {
  richieste = []
  let chiamate = 0
  gestore = (richiesta, risposta) => {
    chiamate++
    if (chiamate === 1) json(risposta, {}, 500)
    else json(risposta, { docs: [{ slug: 'a' }], hasNextPage: false, totalDocs: 1 })
  }
  assert.equal((await leggiCollezione(cms, 'news', '', 10)).length, 1)
  assert.equal(richieste.length, 2)
})

test('risposta che non è JSON -> errore chiaro', async () => {
  gestore = (richiesta, risposta) => {
    risposta.writeHead(200, { 'Content-Type': 'text/html' })
    risposta.end('<html>pagina di errore</html>')
  }
  await assert.rejects(() => leggiCollezione(cms, 'news', '', 10), /non è JSON/)
})

test('CMS spento -> errore che dice di accenderlo', async () => {
  await assert.rejects(
    () => leggiCollezione('http://127.0.0.1:1', 'news', '', 10),
    (e) => e instanceof ErroreCms && /Il CMS non risponde.*È acceso/.test(e.message),
  )
})

test('scaricaFile: l\'indirizzo si costruisce dal nome (codificato), non dall\'url del CMS', async () => {
  richieste = []
  gestore = (richiesta, risposta) => {
    risposta.writeHead(200)
    risposta.end(Buffer.from('contenuto'))
  }
  const dati = await scaricaFile(cms, 'Gara #2 (estate).pdf', 9)
  assert.equal(dati.toString(), 'contenuto')
  assert.equal(richieste[0], '/api/media/file/Gara%20%232%20(estate).pdf')
})

test('scaricaFile: file incompleto o vuoto -> errore', async () => {
  gestore = (richiesta, risposta) => {
    risposta.writeHead(200)
    risposta.end(Buffer.from('abc'))
  }
  await assert.rejects(() => scaricaFile(cms, 'a.pdf', 100), /incompleto \(3 byte invece di 100\)/)
  gestore = (richiesta, risposta) => {
    risposta.writeHead(200)
    risposta.end()
  }
  await assert.rejects(() => scaricaFile(cms, 'a.pdf'), /vuoto/)
})
