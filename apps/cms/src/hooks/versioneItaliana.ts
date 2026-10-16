import { defaultLocale } from '@brainy/content'
import { APIError, type Block, type CollectionBeforeChangeHook, type Field, type GlobalBeforeChangeHook } from 'payload'

import { vuotoDelValidatore } from '../fields/obbligatorio'
import { stessaLingua } from './stessaLingua'

// I campi obbligatori si controllano solo in italiano (vedi fields/obbligatorio.ts). Lavorando in
// un'altra lingua l'italiano non si vede, e si potrebbe creare o pubblicare un contenuto senza titolo:
// qui si blocca la creazione fuori dall'italiano e, prima di salvare una traduzione pubblicata,
// si controlla che la versione italiana sia completa.

type Dati = Record<string, unknown>

const etichetta = (campo: { label?: unknown; name?: string }) => (typeof campo.label === 'string' ? campo.label : campo.name ?? '?')

const righe = (valore: unknown) => (Array.isArray(valore) ? (valore as Dati[]) : [])

/**
 * Etichette dei campi obbligatori vuoti in italiano (es. "Sezioni › Copertina › Titolo").
 * Righe, blocchi e campi non tradotti sono comuni a tutte le lingue: si prendono da `nuovo` (quello che
 * si sta salvando) se c'è, così conta anche una riga aggiunta ora. I testi tradotti si prendono dalla
 * riga italiana con lo stesso id: una riga nuova non ce l'ha, e i suoi campi obbligatori risultano vuoti.
 */
function campiVuoti(campi: Field[], nuovo: Dati | undefined, italiano: Dati | undefined, blocchi: Block[], percorso: string[] = []): string[] {
  const vuoti: string[] = []
  const dentro = (nome: string, tradotto?: boolean) => ({
    n: tradotto ? undefined : (nuovo?.[nome] as Dati | undefined),
    i: italiano?.[nome] as Dati | undefined,
  })
  const accoppia = (nome: string, tradotto?: boolean) => {
    const { n, i } = dentro(nome, tradotto)
    const italiane = righe(i)
    return righe(n ?? i).map((riga) => ({ riga, italiana: italiane.find((r) => r.id === riga.id) }))
  }
  for (const campo of campi) {
    if (campo.type === 'tabs') {
      for (const scheda of campo.tabs) {
        if ('name' in scheda && scheda.name) {
          const { n, i } = dentro(scheda.name)
          vuoti.push(...campiVuoti(scheda.fields, n, i, blocchi, percorso))
        } else vuoti.push(...campiVuoti(scheda.fields, nuovo, italiano, blocchi, percorso))
      }
    } else if (campo.type === 'row' || campo.type === 'collapsible' || (campo.type === 'group' && !('name' in campo && campo.name))) {
      vuoti.push(...campiVuoti(campo.fields, nuovo, italiano, blocchi, percorso))
    } else if (campo.type === 'group') {
      const { n, i } = dentro(campo.name, campo.localized)
      vuoti.push(...campiVuoti(campo.fields, n ?? i, i, blocchi, [...percorso, etichetta(campo)]))
    } else if (campo.type === 'array') {
      for (const { riga, italiana } of accoppia(campo.name, campo.localized)) {
        vuoti.push(...campiVuoti(campo.fields, riga, italiana, blocchi, [...percorso, etichetta(campo)]))
      }
    } else if (campo.type === 'blocks') {
      // I blocchi possono essere scritti nel campo o richiamati per nome da quelli della configurazione.
      const riferimenti = (campo.blockReferences ?? []).map((r) => (typeof r === 'string' ? blocchi.find((b) => b.slug === r) : r))
      const disponibili = [...(campo.blocks ?? []), ...riferimenti.filter((b): b is Block => Boolean(b))]
      for (const { riga, italiana } of accoppia(campo.name, campo.localized)) {
        const blocco = disponibili.find((b) => b.slug === riga.blockType)
        const dove = [...percorso, etichetta(campo), etichetta({ label: blocco?.labels?.singular, name: blocco?.slug })]
        if (blocco) vuoti.push(...campiVuoti(blocco.fields, riga, italiana, blocchi, dove))
      }
    } else if ('name' in campo && 'validate' in campo) {
      const vuoto = vuotoDelValidatore.get(campo.validate)
      const valore = campo.localized || !nuovo || !(campo.name in nuovo) ? italiano?.[campo.name] : nuovo[campo.name]
      if (vuoto?.(valore)) vuoti.push([...percorso, etichetta(campo)].join(' › '))
    }
  }
  return vuoti
}

const inUnAltraLingua = (locale: string | undefined) => Boolean(locale && locale !== defaultLocale && locale !== 'all')

const errore = (vuoti: string[]) =>
  new APIError(`Prima completa la versione italiana: ${[...new Set(vuoti)].join(', ')}.`, 400, undefined, true)

export const versioneItalianaCollezione: CollectionBeforeChangeHook = async ({ collection, data, operation, originalDoc, req }) => {
  if (!inUnAltraLingua(req.locale)) return data
  if (operation === 'create') {
    throw new APIError('I contenuti si creano (e si duplicano) in italiano; le traduzioni si aggiungono dopo, dalle altre lingue.', 400, undefined, true)
  }
  // Una bozza può restare incompleta: il controllo si fa quando si pubblica.
  if (data._status === 'draft') return data
  const italiano = await stessaLingua(req, () =>
    req.payload.findByID({ collection: collection.slug, id: originalDoc.id, locale: defaultLocale, fallbackLocale: false, draft: true, depth: 0, req }),
  )
  const vuoti = campiVuoti(collection.fields, data, italiano as unknown as Dati, req.payload.config.blocks ?? [])
  if (vuoti.length) throw errore(vuoti)
  return data
}

export const versioneItalianaGlobale: GlobalBeforeChangeHook = async ({ data, global, req }) => {
  if (!inUnAltraLingua(req.locale)) return data
  const italiano = await stessaLingua(req, () =>
    req.payload.findGlobal({ slug: global.slug, locale: defaultLocale, fallbackLocale: false, depth: 0, req }),
  )
  const vuoti = campiVuoti(global.fields, data, italiano as unknown as Dati, req.payload.config.blocks ?? [])
  if (vuoti.length) throw errore(vuoti)
  return data
}
