import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'

import { ErroreCms } from './errori'

// Trasforma il testo formattato del CMS (Lexical) in HTML, al momento dello snapshot: nel database
// l'HTML non si salva (la documentazione di Payload lo sconsiglia).
//
// Gli elenchi di serie portano classi, stili e numeri inutili (`<li class="" style="" value="1">`):
// qui producono il markup semplice che dava `marked` nella base. Il contenitore `<div>` si toglie.

type Nodo = { children: unknown[]; listType?: string; start?: unknown; tag?: string }

/**
 * `dove` serve solo ai messaggi (es. "pages/home"). Se il testo contiene qualcosa che il sito non
 * sa mostrare (un nodo sconosciuto, un link a un documento interno...) la conversione segnala l'errore
 * solo con un messaggio nel registro e lascia nel testo un segnaposto: qui diventa un errore vero,
 * così lo snapshot non contiene testi sbagliati senza che nessuno se ne accorga.
 */
export function lexicalInHtml(dati: unknown, dove = ''): string {
  const segnalazioni: string[] = []
  const erroreOriginale = console.error
  console.error = (...argomenti: unknown[]) => {
    segnalazioni.push(argomenti.map(String).join(' '))
  }
  let html: string
  try {
    html = convertLexicalToHTML({
      // Il tipo del convertitore è più stretto di quello che arriva dall'API: il formato è lo stesso.
      data: dati as Parameters<typeof convertLexicalToHTML>[0]['data'],
      disableContainer: true,
      disableIndent: true,
      disableTextAlign: true,
      converters: ({ defaultConverters }) => ({
        ...defaultConverters,
        list: ({ node, nodesToHTML }) => {
          const lista = node as unknown as Nodo
          const tag = lista.tag === 'ol' ? 'ol' : 'ul'
          // `start` arriva dai dati: si inserisce nell'HTML solo se è un numero intero.
          const inizio = tag === 'ol' && Number.isInteger(lista.start) && lista.start !== 1 ? ` start="${lista.start}"` : ''
          return `<${tag}${inizio}>${nodesToHTML({ nodes: node.children }).join('')}</${tag}>`
        },
        listitem: ({ node, nodesToHTML }) => `<li>${nodesToHTML({ nodes: node.children }).join('')}</li>`,
      }),
    })
  } finally {
    console.error = erroreOriginale
  }
  if (segnalazioni.length || html.includes('unknown node')) {
    throw new ErroreCms(
      `Il testo formattato${dove ? ` di ${dove}` : ''} contiene elementi che il sito non sa mostrare: ${
        segnalazioni.join(' | ') || 'nodo sconosciuto'
      }`,
    )
  }
  return html
}
