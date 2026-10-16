import { defaultLocale, linkValido, messaggioLink } from '@brainy/content'
import type { FieldHook, Validate } from 'payload'
import { richText, text, upload } from 'payload/shared'

// Un campo tradotto e obbligatorio lo è nella sola lingua predefinita. Se lo fosse in tutte,
// non si potrebbe salvare una traduzione parziale: con la struttura dei blocchi comune,
// ogni blocco esiste in ogni lingua e pretenderebbe tutti i suoi testi tradotti.
// La lingua predefinita resta obbligatoria perché è anche quella di riserva.

export type Vuoto = (valore: unknown) => boolean

const testoVuoto: Vuoto = (v) => v == null || (typeof v === 'string' && v.trim() === '')

// Un testo formattato è vuoto se non ha né testo scritto né elementi come immagini o linee.
// Paragrafi e a capo da soli, o un nodo di testo con stringa vuota, non contano come contenuto.
type Nodo = { type?: string; text?: string; children?: Nodo[] }

const haContenuto = (nodo: Nodo): boolean => {
  if (nodo.type === 'text') return (nodo.text ?? '').trim() !== ''
  if (nodo.children?.length) return nodo.children.some(haContenuto)
  return nodo.type !== 'paragraph' && nodo.type !== 'linebreak'
}

const testoFormattatoVuoto: Vuoto = (v) => {
  const radice = (v as { root?: Nodo } | null)?.root
  return !radice || !haContenuto(radice)
}

const fileVuoto: Vuoto = (v) => v == null

// Lexical non controlla gli indirizzi dei link sul server: un "javascript:" si salverebbe.
type NodoLink = { type?: string; fields?: { linkType?: string; url?: string }; children?: NodoLink[] }
const linkNonValidi = (nodo: NodoLink): string[] => [
  ...((nodo.type === 'link' || nodo.type === 'autolink') && !linkValido(nodo.fields?.url ?? '') ? [nodo.fields?.url ?? ''] : []),
  ...(nodo.children ?? []).flatMap(linkNonValidi),
]
const linkDelTesto = (valore: unknown) => {
  const radice = (valore as { root?: NodoLink } | null)?.root
  const sbagliati = radice ? linkNonValidi(radice) : []
  return sbagliati.length ? `Link non valido nel testo: "${sbagliati[0]}". ${messaggioLink}.` : true
}

/** Per ogni validatore, come riconoscere un valore vuoto: serve al controllo della versione italiana. */
export const vuotoDelValidatore = new Map<unknown, Vuoto>()

const obbligatorioNellaLinguaPredefinita = (
  vuoto: Vuoto,
  predefinito: Validate,
  // Un controllo in più, valido in tutte le lingue.
  controllo: (valore: unknown) => true | string = () => true,
): Validate => {
  const valida: Validate = async (valore, opzioni) => {
    // Prima i controlli di serie di Payload (lunghezza, file esistente…), che un `validate`
    // personalizzato altrimenti sostituirebbe; l'obbligo lo decide il codice sotto.
    const base = await predefinito(valore, { ...opzioni, required: false })
    if (base !== true) return base
    const altro = controllo(valore)
    if (altro !== true) return altro
    if (opzioni.req.locale && opzioni.req.locale !== defaultLocale) return true
    return vuoto(valore) ? 'Questo campo è obbligatorio.' : true
  }
  vuotoDelValidatore.set(valida, vuoto)
  return valida
}

export const obbligatorioTesto = obbligatorioNellaLinguaPredefinita(testoVuoto, text as Validate)
export const obbligatorioTestoFormattato = obbligatorioNellaLinguaPredefinita(testoFormattatoVuoto, richText as Validate, linkDelTesto)
export const obbligatorioFile = obbligatorioNellaLinguaPredefinita(fileVuoto, upload as Validate)

/**
 * Nelle collezioni senza bozze un campo `required` è NOT NULL anche nella tabella delle traduzioni:
 * una traduzione lasciata vuota darebbe un errore del database. Si salva "", e chi legge
 * ripiega comunque sull'italiano.
 */
const vuotoNelleTraduzioni: FieldHook = ({ value, req }) =>
  req.locale && req.locale !== defaultLocale && value == null ? '' : value

/**
 * Testo tradotto obbligatorio in italiano: si aggiunge al campo con `...testoObbligatorio()`.
 * È una funzione perché ogni campo deve avere i suoi oggetti: Payload li modifica preparando la configurazione.
 */
export const testoObbligatorio = (): { required: true; validate: Validate; hooks: { beforeChange: FieldHook[] } } => ({
  required: true,
  validate: obbligatorioTesto,
  hooks: { beforeChange: [vuotoNelleTraduzioni] },
})
