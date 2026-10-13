// Le persone del Team (collezione "team": un file per persona).
import { getCollection, type CollectionEntry } from 'astro:content';

export type Member = CollectionEntry<'team'>;

// Lo stesso avviso non va ripetuto per ogni pagina che mostra la stessa attività
const warned = new Set<string>();

// Tutte le persone, nell'ordine scelto dal campo "Ordine" e poi per nome.
export async function teamMembers(): Promise<Member[]> {
  const all = await getCollection('team');
  return all.sort((a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name, 'it'));
}

// Trasforma gli id salvati da altre collezioni (i nomi dei file) nelle persone vere.
// Se una persona è stata eliminata la saltiamo e lo scriviamo nel registro della build:
// il sito si costruisce comunque e il dato resta coerente.
export async function membersById(ids: string[] | null | undefined, where = ''): Promise<Member[]> {
  if (!ids?.length) return [];
  const byId = new Map((await getCollection('team')).map((m) => [m.id, m]));
  const found: Member[] = [];
  for (const id of ids) {
    const m = byId.get(id);
    if (m) found.push(m);
    else {
      const msg = `[team] ${where ? where + ': ' : ''}la persona "${id}" non esiste più nel Team e viene saltata.`;
      if (!warned.has(msg)) { warned.add(msg); console.warn(msg); }
    }
  }
  return found;
}
