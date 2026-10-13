import { marked } from 'marked';

// I campi "markdown" dentro i blocchi arrivano come stringhe: li convertiamo in HTML.
// Il contenuto è scritto solo dagli editor autenticati nel CMS.
export const md = (s?: string) => (s ? (marked.parse(s, { async: false }) as string) : '');

export const formatDate = (d: Date) =>
  d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

export const isExternal = (url?: string) => !!url && /^https?:\/\//.test(url);

// Accetta https://youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID oppure l'ID nudo.
export function youtubeId(url: string): string | undefined {
  const m = url.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(url.trim()) ? url.trim() : undefined;
}
