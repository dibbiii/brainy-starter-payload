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
} catch {
  // nessun .env: si usano le variabili d'ambiente e la porta predefinita
}

const porta = process.env.CMS_PORT || '3000'
const next = createRequire(import.meta.url).resolve('next/dist/bin/next')

const figlio = spawn(process.execPath, [next, modo, '-p', porta], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--no-deprecation' },
})
figlio.on('exit', (codice, segnale) => process.exit(codice ?? (segnale ? 1 : 0)))
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => figlio.kill(s))
