// Lettura dell'API REST del CMS, come farebbe un visitatore anonimo: nessun segreto, e di
// conseguenza solo i contenuti pubblicati (le bozze e le modifiche non pubblicate non si vedono).
import { ErroreCms } from './errori'

const TEMPO_JSON_MS = 30_000
// Un file grande su una rete lenta ha bisogno di più tempo; il limite include anche la lettura del corpo.
const TEMPO_FILE_MS = 180_000
const TENTATIVI = 3

const attendi = (tentativo: number) => new Promise((risolvi) => setTimeout(risolvi, 300 * tentativo))
const eTempoScaduto = (errore: unknown) => ['TimeoutError', 'AbortError'].includes((errore as Error)?.name)

/** Una richiesta, con qualche nuovo tentativo se il CMS è momentaneamente irraggiungibile o risponde 5xx. */
async function richiedi(url: string, tempoMs: number): Promise<Response> {
  for (let tentativo = 1; ; tentativo++) {
    let risposta: Response
    try {
      risposta = await fetch(url, { signal: AbortSignal.timeout(tempoMs) })
    } catch (errore) {
      if (tentativo < TENTATIVI) {
        await attendi(tentativo)
        continue
      }
      const motivo = eTempoScaduto(errore) ? `tempo scaduto dopo ${tempoMs / 1000} s` : errore instanceof Error ? errore.message : String(errore)
      throw new ErroreCms(`Il CMS non risponde su ${new URL(url).origin} (${motivo}). È acceso? (npm run dev:cms)`)
    }
    if (risposta.status >= 500 && tentativo < TENTATIVI) {
      await attendi(tentativo)
      continue
    }
    if (!risposta.ok) throw new ErroreCms(`Risposta HTTP ${risposta.status} da ${url}`)
    return risposta
  }
}

async function leggiJson<T>(url: string): Promise<T> {
  const risposta = await richiedi(url, TEMPO_JSON_MS)
  try {
    return (await risposta.json()) as T
  } catch (errore) {
    if (eTempoScaduto(errore)) throw new ErroreCms(`Tempo scaduto leggendo la risposta di ${url}`)
    throw new ErroreCms(`Risposta non valida (non è JSON) da ${url}`)
  }
}

type Pagina = { docs: { slug?: unknown }[]; hasNextPage: boolean; totalDocs: number }

/** Tutti i documenti di una collezione, pagina dopo pagina: l'API ne restituisce poche alla volta. */
export async function leggiCollezione(
  cms: string,
  collezione: string,
  parametri: string,
  perPagina: number,
): Promise<{ slug?: unknown }[]> {
  const documenti: { slug?: unknown }[] = []
  let totaleIniziale: number | undefined
  for (let pagina = 1; ; pagina++) {
    // L'ordine per slug è totale e stabile (lo slug è univoco): senza, due pagine diverse potrebbero
    // ripetere o saltare un documento.
    const url = `${cms}/api/${collezione}?limit=${perPagina}&page=${pagina}&sort=slug&depth=1&${parametri}`
    const risultato = await leggiJson<Pagina>(url)
    totaleIniziale ??= risultato.totalDocs
    // Se qualcuno aggiunge o toglie un contenuto mentre si legge, le pagine successive scalano di uno
    // e un documento verrebbe saltato o ripetuto senza che il totale lo mostri: meglio rifare.
    if (risultato.totalDocs !== totaleIniziale) {
      throw new ErroreCms(
        `"${collezione}": i contenuti sono cambiati durante la lettura (da ${totaleIniziale} a ${risultato.totalDocs} documenti). Riprova.`,
      )
    }
    documenti.push(...risultato.docs)
    if (!risultato.hasNextPage) break
    if (pagina >= 10_000) throw new ErroreCms(`Troppe pagine di risultati per "${collezione}": c'è un errore.`)
  }
  if (documenti.length !== totaleIniziale) {
    throw new ErroreCms(`"${collezione}": il CMS dichiara ${totaleIniziale} documenti ma ne sono arrivati ${documenti.length}. Riprova.`)
  }
  const slug = documenti.map((d) => d.slug).filter((s) => s !== undefined)
  if (new Set(slug).size !== slug.length) {
    throw new ErroreCms(`"${collezione}": ci sono documenti con lo stesso slug nella risposta (probabile lettura incoerente). Riprova.`)
  }
  return documenti
}

/** Un'impostazione (Globals): un solo documento. */
export const leggiGlobale = (cms: string, nome: string, parametri: string): Promise<unknown> =>
  leggiJson(`${cms}/api/globals/${nome}?depth=1&${parametri}`)

/**
 * Scarica un file (media) dal CMS. L'indirizzo lo costruiamo noi dal nome del file: quello restituito
 * dal CMS diventa assoluto appena si imposta `serverURL`.
 */
export async function scaricaFile(cms: string, nomeFile: string, dimensioneAttesa?: number): Promise<Buffer> {
  const percorso = `/api/media/file/${encodeURIComponent(nomeFile)}`
  const risposta = await richiedi(`${cms}${percorso}`, TEMPO_FILE_MS)
  let dati: Buffer
  try {
    dati = Buffer.from(await risposta.arrayBuffer())
  } catch (errore) {
    if (eTempoScaduto(errore)) throw new ErroreCms(`Tempo scaduto scaricando ${nomeFile}`)
    throw errore
  }
  if (dati.length === 0) throw new ErroreCms(`Il file ${nomeFile} è arrivato vuoto.`)
  if (dimensioneAttesa !== undefined && dati.length !== dimensioneAttesa) {
    throw new ErroreCms(`Il file ${nomeFile} è arrivato incompleto (${dati.length} byte invece di ${dimensioneAttesa}).`)
  }
  return dati
}
