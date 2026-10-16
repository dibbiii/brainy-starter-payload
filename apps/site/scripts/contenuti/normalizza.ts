// Trasforma i documenti come li restituisce il CMS nella forma della base, che il sito già conosce:
// - i media popolati diventano percorsi "/media/x.svg" e il loro testo alternativo un campo "*_alt";
// - i blocchi usano "type" al posto di "blockType";
// - il testo formattato (Lexical) diventa HTML;
// - i campi di sistema (id, date di modifica, stato) e quelli vuoti spariscono.
import path from 'node:path'

import { lexicalInHtml } from './html'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dati = Record<string, any>

export type Contesto = {
  /** File dei media usati: nome del file -> dimensione dichiarata dal CMS (per controllare il download). */
  media: Map<string, { dimensione?: number }>
  /** Nomi dei media in minuscolo: due nomi uguali a meno delle maiuscole si sovrascriverebbero su Windows e macOS. */
  minuscoli: Map<string, string>
  /** Segnalazioni che non fermano l'aggiornamento (es. un riferimento non leggibile). Senza ripetizioni. */
  avvisi: Set<string>
  /** Problemi che fermano l'aggiornamento. */
  errori: string[]
  /** Contenuto in lavorazione, per i messaggi (es. "pages/home"). */
  dove: string
}

export const nuovoContesto = (): Contesto => ({
  media: new Map(),
  minuscoli: new Map(),
  avvisi: new Set(),
  errori: [],
  dove: '',
})

// Campi che contengono un media: servono a riconoscere un media non popolato (solo l'id, per esempio
// perché non leggibile). Un media popolato si riconosce dalla forma, qualunque sia il nome del campo.
const CAMPI_MEDIA = new Set(['image', 'file', 'photo', 'cover', 'logo', 'og_image', 'header_image', 'footer_logo'])
// Campi di testo formattato.
const CAMPI_TESTO_FORMATTATO = new Set(['content', 'body'])
const CAMPI_DI_SISTEMA = new Set(['id', 'blockName', 'createdAt', 'updatedAt', '_status', 'globalType'])

type MediaPopolato = { filename: string; mimeType: string; filesize?: number; alt?: string | null }
const eMedia = (v: unknown): v is MediaPopolato =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as MediaPopolato).filename === 'string' &&
  typeof (v as MediaPopolato).mimeType === 'string'

/** Registra il file tra quelli da scaricare e restituisce il suo indirizzo nel sito (codificato per l'URL). */
function registraMedia(media: MediaPopolato, ctx: Contesto): string | undefined {
  const nome = media.filename
  if (!nome || nome !== path.basename(nome) || nome.includes('\\')) {
    ctx.errori.push(`${ctx.dove}: il nome del file "${nome}" non è valido per lo snapshot (contiene percorsi).`)
    return undefined
  }
  const minuscolo = nome.toLowerCase()
  const altro = ctx.minuscoli.get(minuscolo)
  if (altro && altro !== nome) {
    ctx.errori.push(
      `${ctx.dove}: due media si chiamano uguale a meno delle maiuscole ("${altro}" e "${nome}"): ` +
        'su Windows, macOS e sui server di file senza distinzione di maiuscole si sovrascriverebbero. Rinomina uno dei due.',
    )
  }
  ctx.minuscoli.set(minuscolo, nome)
  ctx.media.set(nome, { dimensione: typeof media.filesize === 'number' ? media.filesize : undefined })
  return `/media/${encodeURIComponent(nome)}`
}

export function normalizza(valore: unknown, ctx: Contesto): unknown {
  if (valore === null || valore === undefined) return undefined
  if (Array.isArray(valore)) return valore.map((elemento) => normalizza(elemento, ctx)).filter((e) => e !== undefined)
  if (typeof valore === 'object') {
    const uscita: Dati = {}
    for (const [chiave, v] of Object.entries(valore)) {
      if (CAMPI_DI_SISTEMA.has(chiave)) continue
      if (chiave === 'blockType') {
        uscita.type = v
      } else if (eMedia(v) || CAMPI_MEDIA.has(chiave)) {
        if (eMedia(v)) {
          const percorso = registraMedia(v, ctx)
          if (percorso) {
            uscita[chiave] = percorso
            // I documenti da scaricare non hanno un testo alternativo.
            if (v.alt && chiave !== 'file') uscita[`${chiave}_alt`] = v.alt
          }
        } else if (v !== null && v !== undefined) {
          ctx.avvisi.add(`${ctx.dove}: il campo "${chiave}" punta a un file che non si può leggere: viene omesso.`)
        }
      } else if (CAMPI_TESTO_FORMATTATO.has(chiave) && v && typeof v === 'object') {
        uscita[chiave] = lexicalInHtml(v, ctx.dove)
      } else {
        const normalizzato = normalizza(v, ctx)
        if (normalizzato !== undefined) uscita[chiave] = normalizzato
      }
    }
    return uscita
  }
  // Un testo vuoto vale come assente.
  if (typeof valore === 'string' && valore === '') return undefined
  return valore
}

export type Voce = { id: string; data: unknown }

/** Un contenuto di una collezione: l'identificatore è lo slug; i collegamenti diventano slug. */
export function voce(
  collezione: string,
  documento: Dati,
  ctx: Contesto,
  collegamenti: Record<string, 'uno' | 'molti'> = {},
): Voce {
  const slug = documento.slug
  if (typeof slug !== 'string' || !slug) throw new Error(`${collezione}: un documento è arrivato senza slug.`)
  ctx.dove = `${collezione}/${slug}`

  // I collegamenti (responsabili, attività della news) arrivano come documenti popolati:
  // si tengono da parte e si sostituiscono con gli slug, che sono gli identificatori del sito.
  const resto: Dati = { ...documento }
  delete resto.slug
  const slugCollegati: Dati = {}
  for (const [campo, tipo] of Object.entries(collegamenti)) {
    const valore = resto[campo]
    delete resto[campo]
    const comeSlug = (v: unknown): string | undefined => {
      if (v && typeof v === 'object' && typeof (v as Dati).slug === 'string') return (v as Dati).slug
      if (v !== null && v !== undefined) {
        ctx.avvisi.add(`${ctx.dove}: il collegamento "${campo}" punta a un elemento non pubblicato o non leggibile: viene omesso.`)
      }
      return undefined
    }
    if (tipo === 'molti') slugCollegati[campo] = ((valore as unknown[] | null | undefined) ?? []).map(comeSlug).filter(Boolean)
    else {
      const s = comeSlug(valore)
      if (s) slugCollegati[campo] = s
    }
  }
  return { id: slug, data: { ...(normalizza(resto, ctx) as Dati), ...slugCollegati } }
}

/** Un'impostazione (Globals): un solo documento senza slug. */
export function globale(nome: string, documento: unknown, ctx: Contesto): unknown {
  ctx.dove = `impostazioni/${nome}`
  return normalizza(documento, ctx)
}
