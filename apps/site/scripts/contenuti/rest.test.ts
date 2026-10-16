import assert from 'node:assert/strict'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'

import { ErroreCms } from './errori'
import { indirizzoCms, leggiCollezione, scaricaFile, verificaChiave, type Accesso } from './rest'

// Un finto CMS: ogni test imposta come deve rispondere.
type Gestore = (richiesta: IncomingMessage, risposta: ServerResponse) => void
let gestore: Gestore = () => undefined
let richieste: IncomingMessage[] = []
let server: Server
let accesso: Accesso

before(async () => {
  server = createServer((richiesta, risposta) => {
    richieste.push(richiesta)
    gestore(richiesta, risposta)
  })
  await new Promise<void>((risolvi) => server.listen(0, '127.0.0.1', risolvi))
  accesso = { cms: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }
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
  const tutti = Array.from({ length: n }, (_, i) => ({ id: i + 1, slug: `doc-${String(i).padStart(2, '0')}` }))
  const docs = tutti.slice((pagina - 1) * limite, pagina * limite)
  json(risposta, { docs, hasNextPage: pagina * limite < n, totalDocs: totale })
}

test('leggiCollezione: scorre tutte le pagine, ordinate per id', async () => {
  richieste = []
  gestore = paginaDi(5)
  const documenti = await leggiCollezione(accesso, 'news', 'locale=it', 2)
  assert.equal(documenti.length, 5)
  assert.equal(richieste.length, 3)
  const url = richieste[0].url ?? ''
  assert.ok(url.includes('limit=2') && url.includes('sort=id') && url.includes('locale=it'), url)
})

test('leggiCollezione: il totale cambia durante la lettura -> errore, non dati incoerenti', async () => {
  let chiamate = 0
  gestore = (richiesta, risposta) => {
    chiamate++
    json(risposta, { docs: [{ id: chiamate, slug: `a${chiamate}` }], hasNextPage: chiamate < 2, totalDocs: chiamate === 1 ? 2 : 1 })
  }
  await assert.rejects(() => leggiCollezione(accesso, 'news', '', 1), /cambiati durante la lettura/)
})

test('leggiCollezione: il numero di documenti non torna con il totale -> errore', async () => {
  gestore = paginaDi(3, 4)
  await assert.rejects(() => leggiCollezione(accesso, 'news', '', 10), /dichiara 4 documenti ma ne sono arrivati 3/)
})

test('leggiCollezione: slug o id ripetuti -> errore', async () => {
  gestore = (richiesta, risposta) => json(risposta, { docs: [{ id: 1, slug: 'x' }, { id: 2, slug: 'x' }], hasNextPage: false, totalDocs: 2 })
  await assert.rejects(() => leggiCollezione(accesso, 'news', '', 10), /stesso slug/)
  gestore = (richiesta, risposta) => json(risposta, { docs: [{ id: 1, slug: 'x' }, { id: 1, slug: 'y' }], hasNextPage: false, totalDocs: 2 })
  await assert.rejects(() => leggiCollezione(accesso, 'news', '', 10), /stesso id/)
})

test('un errore 404 non si riprova', async () => {
  richieste = []
  gestore = (richiesta, risposta) => json(risposta, {}, 404)
  await assert.rejects(() => leggiCollezione(accesso, 'news', '', 10), /HTTP 404/)
  assert.equal(richieste.length, 1)
})

test('un errore 500 momentaneo si riprova e poi va', async () => {
  richieste = []
  let chiamate = 0
  gestore = (richiesta, risposta) => {
    chiamate++
    if (chiamate === 1) json(risposta, {}, 500)
    else json(risposta, { docs: [{ id: 1, slug: 'a' }], hasNextPage: false, totalDocs: 1 })
  }
  assert.equal((await leggiCollezione(accesso, 'news', '', 10)).length, 1)
  assert.equal(richieste.length, 2)
})

test('un JSON troncato si riprova', async () => {
  richieste = []
  let chiamate = 0
  gestore = (richiesta, risposta) => {
    chiamate++
    if (chiamate === 1) {
      risposta.writeHead(200, { 'Content-Type': 'application/json' })
      risposta.end('{"docs":[{"id":1')
    } else json(risposta, { docs: [{ id: 1, slug: 'a' }], hasNextPage: false, totalDocs: 1 })
  }
  assert.equal((await leggiCollezione(accesso, 'news', '', 10)).length, 1)
  assert.equal(richieste.length, 2)
})

test('risposta che non è JSON -> errore chiaro dopo i tentativi', async () => {
  richieste = []
  gestore = (richiesta, risposta) => {
    risposta.writeHead(200, { 'Content-Type': 'text/html' })
    risposta.end('<html>pagina di errore</html>')
  }
  await assert.rejects(() => leggiCollezione(accesso, 'news', '', 10), (e) => e instanceof ErroreCms && /non è JSON/.test(e.message))
  assert.equal(richieste.length, 3)
})

test('CMS spento -> errore che dice di accenderlo', async () => {
  await assert.rejects(
    () => leggiCollezione({ cms: 'http://127.0.0.1:1' }, 'news', '', 10),
    (e) => e instanceof ErroreCms && /Il CMS non risponde.*È acceso/.test(e.message),
  )
})

test('con la chiave si manda l\'intestazione di Payload; accesso negato -> errore chiaro', async () => {
  richieste = []
  gestore = (richiesta, risposta) => json(risposta, { errors: [] }, 403)
  await assert.rejects(() => leggiCollezione({ ...accesso, chiave: 'abc' }, 'team', '', 10), /Accesso negato.*CMS_API_KEY/)
  assert.equal(richieste[0].headers.authorization, 'chiavi-api API-Key abc')
  assert.equal(richieste.length, 1)
})

test('senza chiave nessuna intestazione Authorization', async () => {
  richieste = []
  gestore = paginaDi(1)
  await leggiCollezione(accesso, 'team', '', 10)
  assert.equal(richieste[0].headers.authorization, undefined)
})

test('scaricaFile: l\'indirizzo si costruisce dal nome (codificato), non dall\'url del CMS', async () => {
  richieste = []
  gestore = (richiesta, risposta) => {
    risposta.writeHead(200)
    risposta.end(Buffer.from('contenuto'))
  }
  const dati = await scaricaFile(accesso, 'Gara #2 (estate).pdf', 9)
  assert.equal(dati.toString(), 'contenuto')
  assert.equal(richieste[0].url, '/api/media/file/Gara%20%232%20(estate).pdf')
})

test('scaricaFile: file incompleto o vuoto -> si riprova, poi errore', async () => {
  richieste = []
  gestore = (richiesta, risposta) => {
    risposta.writeHead(200)
    risposta.end(Buffer.from('abc'))
  }
  await assert.rejects(() => scaricaFile(accesso, 'a.pdf', 100), /incompleto \(3 byte invece di 100\)/)
  assert.equal(richieste.length, 3)
  gestore = (richiesta, risposta) => {
    risposta.writeHead(200)
    risposta.end()
  }
  await assert.rejects(() => scaricaFile(accesso, 'a.pdf'), /vuoto/)
})

test('scaricaFile: un file troncato una volta arriva al secondo tentativo', async () => {
  let chiamate = 0
  gestore = (richiesta, risposta) => {
    chiamate++
    risposta.writeHead(200)
    risposta.end(Buffer.from(chiamate === 1 ? 'ab' : 'abcd'))
  }
  assert.equal((await scaricaFile(accesso, 'a.pdf', 4)).toString(), 'abcd')
})

test('verificaChiave: Payload non riconosce la chiave (user null) -> errore; riconosciuta -> va', async () => {
  gestore = (richiesta, risposta) => json(risposta, { user: null })
  await assert.rejects(() => verificaChiave({ ...accesso, chiave: 'x' }), /non è una chiave valida/)
  gestore = (richiesta, risposta) => json(risposta, { user: { id: 1 } })
  await verificaChiave({ ...accesso, chiave: 'x' })
  assert.equal(richieste.at(-1)?.url, '/api/chiavi-api/me')
})

test('indirizzoCms: solo http/https, niente credenziali, "?" o "#" (anche da soli in fondo)', () => {
  assert.equal(indirizzoCms('http://localhost:3000/'), 'http://localhost:3000')
  assert.equal(indirizzoCms('https://cms.esempio.it/sotto/'), 'https://cms.esempio.it/sotto')
  for (const sbagliato of ['localhost:3000', 'ftp://x', 'http://a:b@x', 'http://x/?', 'http://x/#', 'http://x/?a=1', 'non un url']) {
    assert.throws(() => indirizzoCms(sbagliato), ErroreCms, sbagliato)
  }
})

test('leggiCollezione: risposta senza elenco dei documenti -> errore chiaro, non un TypeError', async () => {
  gestore = (richiesta, risposta) => json(risposta, { messaggio: 'proxy' })
  await assert.rejects(() => leggiCollezione(accesso, 'news', '', 10), (e) => e instanceof ErroreCms && /Risposta inattesa/.test(e.message))
})
