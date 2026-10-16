// Avvia Next.js (dev o start) sulla porta CMS_PORT del .env alla radice del repository.
// Next accetta la porta solo da riga di comando o dalla variabile PORT, non dal suo
// file di configurazione, quindi serve questo piccolo avvio.
//
// Uso: node scripts/next.mjs dev|start
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const modo = process.argv[2]
if (modo !== 'dev' && modo !== 'start') {
  console.error('Uso: node scripts/next.mjs dev|start')
  process.exit(1)
}

// Le variabili già presenti nell'ambiente hanno la precedenza sul file.
try {
  process.loadEnvFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env'))
} catch (errore) {
  // Un .env che non c'è va bene (si usano le variabili d'ambiente); un errore di lettura no.
  if (errore.code !== 'ENOENT') throw errore
}

const porta = process.env.CMS_PORT || '3000'
const next = createRequire(import.meta.url).resolve('next/dist/bin/next')
// In sviluppo solo da questo computer: il pannello di sviluppo non deve essere raggiungibile dalla rete.
// In produzione tutte le interfacce (container, proxy su un'altra macchina), oppure CMS_HOST (es. 127.0.0.1 dietro un proxy locale).
const host = modo === 'dev' ? '127.0.0.1' : process.env.CMS_HOST
const indirizzo = host ? ['-H', host] : []

const figlio = spawn(process.execPath, [next, modo, '-p', porta, ...indirizzo], {
  stdio: 'inherit',
  // Si aggiunge alle opzioni già impostate (es. --max-old-space-size), senza sostituirle.
  env: { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, '--no-deprecation'].filter(Boolean).join(' ') },
})
figlio.on('exit', (codice, segnale) => process.exit(codice ?? (segnale ? 1 : 0)))
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => figlio.kill(s))
