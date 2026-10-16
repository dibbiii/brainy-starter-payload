import { convertLexicalToHTML, type HTMLConverters, type HTMLConvertersFunction } from '@payloadcms/richtext-lexical/html'

import { urlSicuro } from '../../src/lib/format'
import { ErroreCms } from './errori'

// Trasforma il testo formattato del CMS (Lexical) in HTML, al momento dello snapshot: nel database
// l'HTML non si salva (la documentazione di Payload lo sconsiglia).
//
// Si convertono solo i nodi che l'editor del progetto permette, con markup semplice come quello che
// dava `marked` nella base: niente classi, niente style="" (la CSP del sito li bloccherebbe).
// Tutto il resto è un errore, così lo snapshot non contiene testi sbagliati senza che nessuno lo sappia.

type Nodo = { type?: string; children?: unknown[]; tag?: string; start?: unknown; text?: string; format?: unknown }
type Link = { fields?: { linkType?: string; url?: string; newTab?: boolean } }

const FORMATO_GRASSETTO = 1
const FORMATO_CORSIVO = 2
const TITOLI = new Set(['h2', 'h3', 'h4', 'h5', 'h6'])

const escape = (testo: string) =>
  testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** `dove` serve solo ai messaggi (es. "pages/home"). */
export function lexicalInHtml(dati: unknown, dove = ''): string {
  const problemi: string[] = []
  const converters: HTMLConvertersFunction = () => {
    const figli = (nodesToHTML: (a: { nodes: never[] }) => string[], nodo: unknown) =>
      nodesToHTML({ nodes: ((nodo as Nodo).children ?? []) as never[] }).join('')
    const link = ({ node, nodesToHTML }: { node: unknown; nodesToHTML: (a: { nodes: never[] }) => string[] }) => {
      const { linkType, url, newTab } = (node as Link).fields ?? {}
      const testo = figli(nodesToHTML, node)
      const href = linkType === 'internal' ? undefined : urlSicuro(url)
      if (!href) {
        problemi.push(linkType === 'internal' ? `link a un documento interno ("${testo}")` : `link non valido "${url ?? ''}"`)
        return testo
      }
      return `<a href="${escape(href)}"${newTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${testo}</a>`
    }
    const convertitori: HTMLConverters = {
      paragraph: ({ node, nodesToHTML }) => {
        const html = figli(nodesToHTML, node)
        return html ? `<p>${html}</p>` : '<p><br /></p>'
      },
      // Il sito ha già un h1 per pagina: un "Titolo 1" nel testo diventa un h2.
      heading: ({ node, nodesToHTML }) => {
        const tag = TITOLI.has((node as Nodo).tag ?? '') ? (node as Nodo).tag : 'h2'
        return `<${tag}>${figli(nodesToHTML, node)}</${tag}>`
      },
      list: ({ node, nodesToHTML }) => {
        const lista = node as Nodo
        const tag = lista.tag === 'ol' ? 'ol' : 'ul'
        // `start` arriva dai dati: si inserisce nell'HTML solo se è un numero intero.
        const inizio = tag === 'ol' && Number.isInteger(lista.start) && lista.start !== 1 ? ` start="${lista.start}"` : ''
        return `<${tag}${inizio}>${figli(nodesToHTML, node)}</${tag}>`
      },
      listitem: ({ node, nodesToHTML }) => `<li>${figli(nodesToHTML, node)}</li>`,
      quote: ({ node, nodesToHTML }) => `<blockquote>${figli(nodesToHTML, node)}</blockquote>`,
      horizontalrule: '<hr />',
      linebreak: '<br />',
      tab: '\t',
      // Solo grassetto e corsivo: gli altri formati l'editor non li offre e qui si ignorano.
      text: ({ node }) => {
        const { text = '', format } = node as Nodo
        let html = escape(text)
        const bit = typeof format === 'number' ? format : 0
        if (bit & FORMATO_GRASSETTO) html = `<strong>${html}</strong>`
        if (bit & FORMATO_CORSIVO) html = `<em>${html}</em>`
        return html
      },
      link,
      autolink: link,
      unknown: ({ node }) => {
        problemi.push(`elemento "${(node as Nodo).type ?? '?'}"`)
        return ''
      },
    }
    // Senza prototipo: un nodo di tipo "constructor" o "toString" non trova un convertitore per sbaglio.
    return Object.assign(Object.create(null), convertitori)
  }

  // Un convertitore che va in errore viene scritto con console.error e saltato: qui si raccoglie.
  const erroreOriginale = console.error
  console.error = (...argomenti: unknown[]) => {
    problemi.push(argomenti.map(String).join(' '))
  }
  let html: string
  try {
    html = convertLexicalToHTML({
      // Il tipo del convertitore è più stretto di quello che arriva dall'API: il formato è lo stesso.
      data: dati as Parameters<typeof convertLexicalToHTML>[0]['data'],
      disableContainer: true,
      disableIndent: true,
      disableTextAlign: true,
      converters,
    })
  } finally {
    console.error = erroreOriginale
  }
  if (problemi.length) {
    throw new ErroreCms(
      `Il testo formattato${dove ? ` di ${dove}` : ''} contiene elementi che il sito non sa mostrare: ${[...new Set(problemi)].join(' | ')}`,
    )
  }
  return html
}
