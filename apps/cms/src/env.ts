import path from 'path'

// Tutte le variabili stanno in un unico .env alla radice del repository, lo stesso che legge Docker Compose. I comandi partono da apps/cms, quindi la radice è due livelli sopra. 
// Le variabili già presenti nell'ambiente non vengono sovrascritte; se il file manca (es. in hosting) si usano quelle della piattaforma.

// Va importato per primo: gli import vengono eseguiti nell'ordine in cui compaiono,
// e i file che leggono process.env a livello di modulo (es. Media) devono trovarle già caricate.
export const rootDir = path.resolve(process.cwd(), '../..')

try {
  process.loadEnvFile(path.join(rootDir, '.env'))
} catch (errore) {
  // Nessun .env: valgono le variabili d'ambiente già impostate. Un altro errore (es. permessi) va segnalato.
  if ((errore as NodeJS.ErrnoException).code !== 'ENOENT') throw errore
}
