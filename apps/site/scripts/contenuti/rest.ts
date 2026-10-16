// Lettura dell'API REST del CMS. Senza chiave si legge come un visitatore anonimo; con la chiave di
// un utente "Lettura per il sito" si vedono anche i campi riservati (es. le email del Team).
// In entrambi i casi arrivano solo i contenuti pubblicati, mai le bozze.
import { ErroreCms } from './errori'

const TEMPO_JSON_MS = 30_000
// Un file grande su una rete lenta ha bisogno di più tempo; il limite include anche la lettura del corpo.
const TEMPO_FILE_MS = 180_000
const TENTATIVI = 3

const attendi = (tentativo: number) => new Promise((risolvi) => setTimeout(risolvi, 300 * tentativo))
const eTempoScaduto = (errore: unknown) => ['TimeoutError', 'AbortError'].includes((errore as Error)?.name)

/** Un problema che può sparire riprovando (rete, corpo troncato): diventa errore solo all'ultimo tentativo. */
class DaRiprovare extends Error {}

export type Accesso = { cms: string; chiave?: string }

/** L'indirizzo finisce in meta.json, che sta nel repository: solo http o https, senza credenziali. */
export function indirizzoCms(indirizzo: string): string {
  let url: URL
  try {
    url = new URL(indirizzo)
  } catch {
    throw new ErroreCms(`Indirizzo del CMS non valido: "${indirizzo}" (es. http://localhost:3000).`)
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new ErroreCms(`L'indirizzo del CMS deve iniziare con http:// o https:// ("${indirizzo}").`)
  // url.search e url.hash restano vuoti con un "?" o un "#" da soli in fondo: si controlla il testo.
  if (url.username || url.password || /[?#]/.test(indirizzo)) {
    throw new ErroreCms(`L'indirizzo del CMS non deve contenere credenziali, "?" o "#" ("${indirizzo}").`)
  }
  return url.href.replace(/\/+$/, '')
}

/**
 * Una richiesta con qualche nuovo tentativo se il CMS è irraggiungibile, risponde 5xx o il corpo arriva
 * rovinato. `leggi` legge il corpo: anche quella parte è dentro i tentativi.
 */
async function richiedi<T>(accesso: Accesso, percorso: string, tempoMs: number, leggi: (r: Response) => Promise<T>): Promise<T> {
  const url = `${accesso.cms}${percorso}`
  const intestazioni = accesso.chiave ? { Authorization: `chiavi-api API-Key ${accesso.chiave}` } : undefined
  for (let tentativo = 1; ; tentativo++) {
    try {
      let risposta: Response
      try {
        risposta = await fetch(url, { headers: intestazioni, signal: AbortSignal.timeout(tempoMs) })
      } catch (errore) {
        const motivo = eTempoScaduto(errore) ? `tempo scaduto dopo ${tempoMs / 1000} s` : errore instanceof Error ? errore.message : String(errore)
        throw new DaRiprovare(`Il CMS non risponde su ${accesso.cms} (${motivo}). È acceso? (npm run dev:cms)`)
      }
      if (risposta.status >= 500) throw new DaRiprovare(`Risposta HTTP ${risposta.status} da ${url}`)
      if (risposta.status === 401 || risposta.status === 403) {
        throw new ErroreCms(`Accesso negato (HTTP ${risposta.status}) da ${url}${accesso.chiave ? ': controlla CMS_API_KEY.' : '.'}`)
      }
      if (!risposta.ok) throw new ErroreCms(`Risposta HTTP ${risposta.status} da ${url}`)
      try {
        return await leggi(risposta)
      } catch (errore) {
        if (errore instanceof ErroreCms || errore instanceof DaRiprovare) throw errore
        throw new DaRiprovare(eTempoScaduto(errore) ? `Tempo scaduto leggendo la risposta di ${url}` : `Risposta interrotta da ${url}`)
      }
    } catch (errore) {
      if (!(errore instanceof DaRiprovare)) throw errore
      if (tentativo >= TENTATIVI) throw new ErroreCms(errore.message)
      await attendi(tentativo)
    }
  }
}

const leggiJson = <T>(accesso: Accesso, percorso: string): Promise<T> =>
  richiedi(accesso, percorso, TEMPO_JSON_MS, async (risposta) => {
    const testo = await risposta.text()
    try {
      return JSON.parse(testo) as T
    } catch {
      // Un JSON troncato si riprova; una pagina HTML (proxy, errore del server) resta un errore anche dopo.
      throw new DaRiprovare(`Risposta non valida (non è JSON) da ${accesso.cms}${percorso}`)
    }
  })

type Documento = { id?: unknown; slug?: unknown }
type Pagina = { docs: Documento[]; hasNextPage: boolean; totalDocs: number }

/** Tutti i documenti di una collezione, pagina dopo pagina: l'API ne restituisce pochi alla volta. */
export async function leggiCollezione(accesso: Accesso, collezione: string, parametri: string, perPagina: number): Promise<Documento[]> {
  const documenti: Documento[] = []
  let totaleIniziale: number | undefined
  for (let pagina = 1; ; pagina++) {
    // Si ordina per id, che non cambia mai: con lo slug, un contenuto rinominato durante la lettura
    // cambierebbe posto e verrebbe saltato o ripetuto.
    const risultato = await leggiJson<Pagina>(accesso, `/api/${collezione}?limit=${perPagina}&page=${pagina}&sort=id&depth=1&${parametri}`)
    if (!Array.isArray(risultato?.docs) || typeof risultato.totalDocs !== 'number') {
      throw new ErroreCms(`Risposta inattesa da ${accesso.cms}/api/${collezione}: manca l'elenco dei documenti.`)
    }
    totaleIniziale ??= risultato.totalDocs
    // Se qualcuno aggiunge o toglie un contenuto mentre si legge, le pagine successive scalano di uno.
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
  for (const campo of ['id', 'slug'] as const) {
    const valori = documenti.map((d) => d[campo]).filter((v) => v !== undefined)
    if (new Set(valori).size !== valori.length) {
      throw new ErroreCms(`"${collezione}": ci sono documenti con lo stesso ${campo} nella risposta (probabile lettura incoerente). Riprova.`)
    }
  }
  return documenti
}

/**
 * Con una chiave sbagliata Payload non dà errore: risponde come a un visitatore anonimo e i campi
 * riservati sparirebbero in silenzio. Qui si controlla prima che la chiave sia riconosciuta.
 */
export async function verificaChiave(accesso: Accesso): Promise<void> {
  if (!accesso.chiave) return
  const { user } = await leggiJson<{ user?: unknown }>(accesso, '/api/chiavi-api/me')
  if (!user) throw new ErroreCms('CMS_API_KEY non è una chiave valida per questo CMS (crea una nuova con npm run chiave:snapshot).')
}

/** Un'impostazione (Globals): un solo documento. */
export const leggiGlobale = (accesso: Accesso, nome: string, parametri: string): Promise<unknown> =>
  leggiJson(accesso, `/api/globals/${nome}?depth=1&${parametri}`)

/**
 * Scarica un file (media) dal CMS. L'indirizzo lo costruiamo noi dal nome del file: quello restituito
 * dal CMS diventa assoluto appena si imposta `serverURL`.
 */
export const scaricaFile = (accesso: Accesso, nomeFile: string, dimensioneAttesa?: number): Promise<Buffer> =>
  richiedi(accesso, `/api/media/file/${encodeURIComponent(nomeFile)}`, TEMPO_FILE_MS, async (risposta) => {
    const dati = Buffer.from(await risposta.arrayBuffer())
    if (dati.length === 0) throw new DaRiprovare(`Il file ${nomeFile} è arrivato vuoto.`)
    if (dimensioneAttesa !== undefined && dati.length !== dimensioneAttesa) {
      throw new DaRiprovare(`Il file ${nomeFile} è arrivato incompleto (${dati.length} byte invece di ${dimensioneAttesa}).`)
    }
    return dati
  })
