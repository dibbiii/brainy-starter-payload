// Controlli sullo snapshot prima di scriverlo.
import type { Voce } from './normalizza'

/**
 * Percorsi dei campi che ci sono nei dati del CMS ma non nei dati validati: lo schema (zod) scarta
 * in silenzio ciò che non conosce, quindi un campo aggiunto al CMS e dimenticato nello schema
 * sparirebbe dal sito senza che nessuno se ne accorga.
 */
export function campiScartati(grezzo: unknown, validato: unknown, percorso: (string | number)[] = []): (string | number)[][] {
  if (Array.isArray(grezzo)) {
    const elementi = Array.isArray(validato) ? validato : []
    return grezzo.flatMap((elemento, i) => campiScartati(elemento, elementi[i], [...percorso, i]))
  }
  if (grezzo && typeof grezzo === 'object') {
    const valido = validato && typeof validato === 'object' ? (validato as Record<string, unknown>) : {}
    return Object.entries(grezzo).flatMap(([chiave, valore]) =>
      chiave in valido ? campiScartati(valore, valido[chiave], [...percorso, chiave]) : [[...percorso, chiave]],
    )
  }
  return []
}

type DatiSnapshot = { activities: Voce[]; team: Voce[]; news: Voce[] }

/** Collegamenti a elementi che nello snapshot non ci sono (es. una lettura fatta mentre si pubblicava). */
export function riferimentiRotti(dati: DatiSnapshot): string[] {
  const attivita = new Set(dati.activities.map((a) => a.id))
  const persone = new Set(dati.team.map((p) => p.id))
  const problemi: string[] = []
  for (const attivitaVoce of dati.activities) {
    const responsabili = ((attivitaVoce.data as { managers?: string[] }).managers ?? []) as string[]
    for (const slug of responsabili) {
      if (!persone.has(slug)) problemi.push(`activities/${attivitaVoce.id} → managers: la persona "${slug}" non è nello snapshot`)
    }
  }
  for (const news of dati.news) {
    const slug = (news.data as { activity?: string }).activity
    if (slug && !attivita.has(slug)) problemi.push(`news/${news.id} → activity: l'attività "${slug}" non è nello snapshot`)
  }
  return problemi
}
