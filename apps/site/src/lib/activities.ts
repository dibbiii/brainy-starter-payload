// Attività (discipline, gare, corsi…): collezione "activities".
// Nome e indirizzo della sezione si impostano in Impostazioni → Dati del sito.
import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from './site';

export type Activity = CollectionEntry<'activities'>;

// "Discipline" / "discipline": senza barre iniziali o finali
export const activitiesLabel = site.activities_label || 'Attività';
export const activitiesPath = (site.activities_path || 'attivita').replace(/^\/+|\/+$/g, '');

export const activitiesMoreTitle = site.activities_more_title || 'Altre attività';
export const activitiesAllLabel = site.activities_all_label || 'Tutte le attività';

export const activitiesIndexUrl = `/${activitiesPath}`;
export const activityUrl = (a: Activity) => `/${activitiesPath}/${a.id}`;

// Tutte le attività, nell'ordine scelto dal campo "Ordine" e poi per nome.
export async function allActivities(): Promise<Activity[]> {
  const all = await getCollection('activities');
  return all.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title, 'it'));
}

// L'elenco (/discipline, /gare…) è una pagina normale con il blocco "Attività".
// Se non esiste, nelle briciole e nei link si evita di puntare a una pagina inesistente.
export async function indexPageExists(): Promise<boolean> {
  return (await getCollection('pages', (p) => p.id === activitiesPath)).length > 0;
}
