import { defaultLocale } from '@brainy/content'
import type { Validate } from 'payload'

// Un campo tradotto e obbligatorio lo è nella sola lingua predefinita. Se lo fosse in tutte,
// non si potrebbe salvare una traduzione parziale: con la struttura dei blocchi comune,
// ogni blocco esiste in ogni lingua e pretenderebbe tutti i suoi testi tradotti.
// La lingua predefinita resta obbligatoria perché è anche quella di riserva.

type Vuoto = (valore: unknown) => boolean

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

const obbligatorioNellaLinguaPredefinita =
  (vuoto: Vuoto): Validate =>
  (valore, { req }) => {
    if (req.locale && req.locale !== defaultLocale) return true
    return vuoto(valore) ? 'Questo campo è obbligatorio.' : true
  }

export const obbligatorioTesto = obbligatorioNellaLinguaPredefinita(testoVuoto)
export const obbligatorioTestoFormattato = obbligatorioNellaLinguaPredefinita(testoFormattatoVuoto)
export const obbligatorioFile = obbligatorioNellaLinguaPredefinita(fileVuoto)
