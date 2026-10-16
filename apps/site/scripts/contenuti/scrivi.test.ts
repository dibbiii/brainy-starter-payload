import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'

import { conRiprove, copiaNuovi, elencaFile, potaVecchi, scriviJson } from './scrivi'

let base: string
before(async () => {
  base = await mkdtemp(path.join(tmpdir(), 'snapshot-test-'))
})
after(async () => {
  await rm(base, { recursive: true, force: true })
})

const crea = async (cartella: string, file: Record<string, string>) => {
  for (const [relativo, contenuto] of Object.entries(file)) {
    await mkdir(path.dirname(path.join(cartella, relativo)), { recursive: true })
    await writeFile(path.join(cartella, relativo), contenuto)
  }
}
const elenco = async (cartella: string) => (await elencaFile(cartella)).map((f) => f.replaceAll('\\', '/')).sort()

test('elencaFile: una cartella che non esiste è vuota', async () => {
  assert.deepEqual(await elencaFile(path.join(base, 'non-esiste')), [])
})

test('elencaFile: un errore diverso da "non esiste" si segnala (non vale "vuoto")', async () => {
  const unFile = path.join(base, 'un-file.txt')
  await writeFile(unFile, 'x')
  // readdir su un file dà ENOTDIR: prima veniva scambiato per una cartella vuota e faceva togliere tutto.
  await assert.rejects(() => elencaFile(unFile), (e: NodeJS.ErrnoException) => e.code === 'ENOTDIR')
})

test('scriviJson: scrive il file e non lascia temporanei', async () => {
  const file = path.join(base, 'json', 'a.json')
  await scriviJson(file, { ok: true })
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), { ok: true })
  assert.deepEqual(await readdir(path.dirname(file)), ['a.json'])
})

test('copiaNuovi non toglie niente e rispetta le esclusioni', async () => {
  const origine = path.join(base, 'c-origine')
  const destinazione = path.join(base, 'c-dest')
  await crea(origine, { 'a.txt': 'nuovo', 'sub/b.txt': 'b', 'meta.json': 'meta-nuovo' })
  await crea(destinazione, { 'a.txt': 'vecchio', 'vecchio.txt': 'v' })
  await copiaNuovi(origine, destinazione, ['meta.json'])
  assert.equal(await readFile(path.join(destinazione, 'a.txt'), 'utf8'), 'nuovo')
  assert.deepEqual(await elenco(destinazione), ['a.txt', 'sub/b.txt', 'vecchio.txt'])
})

test('potaVecchi toglie i file che non ci sono più (anche i temporanei) e le cartelle vuote, ma tiene meta.json', async () => {
  const origine = path.join(base, 'p-origine')
  const destinazione = path.join(base, 'p-dest')
  await crea(origine, { 'a.txt': 'a', 'meta.json': 'nuovo' })
  await crea(destinazione, { 'a.txt': 'a', 'meta.json': 'in-aggiornamento', 'vecchio.txt': 'v', 'sub/c.txt': 'c', 'a.txt.nuovo-123': 'x' })
  await potaVecchi(origine, destinazione)
  assert.deepEqual(await elenco(destinazione), ['a.txt', 'meta.json'])
  assert.deepEqual((await readdir(destinazione)).sort(), ['a.txt', 'meta.json'])
})

test('conRiprove: riprova sugli errori momentanei di Windows (EPERM/EBUSY)', async () => {
  let chiamate = 0
  const risultato = await conRiprove(async () => {
    chiamate++
    if (chiamate < 3) throw Object.assign(new Error('occupato'), { code: 'EPERM' })
    return 'fatto'
  })
  assert.equal(risultato, 'fatto')
  assert.equal(chiamate, 3)
})

test('conRiprove: gli altri errori non si riprovano', async () => {
  let chiamate = 0
  await assert.rejects(
    () =>
      conRiprove(async () => {
        chiamate++
        throw Object.assign(new Error('non esiste'), { code: 'ENOENT' })
      }),
    /non esiste/,
  )
  assert.equal(chiamate, 1)
})

test('conRiprove: dopo troppi tentativi si arrende', async () => {
  let chiamate = 0
  await assert.rejects(
    () =>
      conRiprove(async () => {
        chiamate++
        throw Object.assign(new Error('sempre occupato'), { code: 'EBUSY' })
      }),
    /sempre occupato/,
  )
  assert.equal(chiamate, 5)
})
