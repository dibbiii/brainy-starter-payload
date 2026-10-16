import { copyFile, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Scrittura dei file dello snapshot. Si prepara tutto in una cartella di appoggio e solo a controlli
// superati si copia nel posto vero, in quest'ordine (lo fa aggiorna-contenuti.ts):
//   1. si segna meta.json come "in-aggiornamento";
//   2. si copiano i file nuovi o cambiati (media, poi dati) senza togliere niente;
//   3. si tolgono i file che non ci sono più;
//   4. si scrive meta.json con stato "ok".
// Se qualcosa si interrompe fra 1 e 4, meta.json lo dice e chi legge può rifiutare lo snapshot.
// Ogni file si scrive con un nome temporaneo e un rinomina, quindi non resta mai a metà.

const TENTATIVI = 5
const ATTESA_MS = 150

// Su Windows un antivirus, l'indicizzatore o il server di sviluppo possono tenere un file aperto per un istante.
const eTransitorio = (errore: unknown) => ['EPERM', 'EBUSY'].includes((errore as NodeJS.ErrnoException)?.code ?? '')

/** Ripete un'operazione sui file se fallisce per un blocco momentaneo. */
export async function conRiprove<T>(operazione: () => Promise<T>): Promise<T> {
  for (let tentativo = 1; ; tentativo++) {
    try {
      return await operazione()
    } catch (errore) {
      if (!eTransitorio(errore) || tentativo >= TENTATIVI) throw errore
      await new Promise((risolvi) => setTimeout(risolvi, ATTESA_MS * tentativo))
    }
  }
}

export async function scriviJson(file: string, dati: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true })
  const temporaneo = `${file}.nuovo-${process.pid}`
  await writeFile(temporaneo, JSON.stringify(dati, null, 2) + '\n', 'utf8')
  await conRiprove(() => rename(temporaneo, file))
}

/**
 * Elenco dei file di una cartella (percorsi relativi, anche nelle sottocartelle).
 * Una cartella che non esiste vale come vuota; ogni altro errore (permessi, troppi file aperti...)
 * si segnala: considerarlo "vuoto" farebbe togliere tutto da `potaVecchi`.
 */
export async function elencaFile(cartella: string, prefisso = ''): Promise<string[]> {
  let voci
  try {
    voci = await readdir(path.join(cartella, prefisso), { withFileTypes: true })
  } catch (errore) {
    if ((errore as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw errore
  }
  const file: string[] = []
  for (const voce of voci) {
    const relativo = path.join(prefisso, voce.name)
    if (voce.isDirectory()) file.push(...(await elencaFile(cartella, relativo)))
    else file.push(relativo)
  }
  return file
}

/** Copia in `destinazione` i file di `origine` (tranne quelli indicati), senza togliere nulla. */
export async function copiaNuovi(origine: string, destinazione: string, escludi: string[] = []): Promise<void> {
  await mkdir(destinazione, { recursive: true })
  for (const relativo of await elencaFile(origine)) {
    if (escludi.includes(relativo)) continue
    const a = path.join(destinazione, relativo)
    await mkdir(path.dirname(a), { recursive: true })
    const temporaneo = `${a}.nuovo-${process.pid}`
    await conRiprove(() => copyFile(path.join(origine, relativo), temporaneo))
    await conRiprove(() => rename(temporaneo, a))
  }
}

async function rimuoviCartelleVuote(cartella: string): Promise<void> {
  const voci = await readdir(cartella, { withFileTypes: true }).catch((errore: NodeJS.ErrnoException) => {
    if (errore.code === 'ENOENT') return []
    throw errore
  })
  for (const voce of voci) {
    if (!voce.isDirectory()) continue
    const sotto = path.join(cartella, voce.name)
    await rimuoviCartelleVuote(sotto)
    if ((await readdir(sotto)).length === 0) await conRiprove(() => rm(sotto, { recursive: true }))
  }
}

/** Toglie da `destinazione` i file che in `origine` non ci sono più (compresi i temporanei rimasti da un'interruzione). */
export async function potaVecchi(origine: string, destinazione: string): Promise<void> {
  const mantenuti = new Set(await elencaFile(origine))
  for (const relativo of await elencaFile(destinazione)) {
    if (!mantenuti.has(relativo)) await conRiprove(() => rm(path.join(destinazione, relativo)))
  }
  await rimuoviCartelleVuote(destinazione)
}
