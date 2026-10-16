import { Marked } from 'marked';

// I campi "markdown" dentro i blocchi arrivano come stringhe: li convertiamo in HTML.
// Il contenuto è scritto solo dagli editor autenticati nel CMS. I link markdown passano da urlSicuro
// (l'HTML scritto a mano no). La & diventa &amp; perché marked lascia intatte entità come "&colon;".
const marked = new Marked({
  walkTokens(token) {
    if (token.type === 'link' || token.type === 'image') {
      token.href = urlSicuro(token.href)?.replace(/&/g, '&amp;') ?? '';
    }
  },
});
export const md = (s?: string) => (s ? (marked.parse(s, { async: false }) as string) : '');

export const formatDate = (d: Date) =>
  d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

export const isExternal = (url?: string) => !!url && /^https?:\/\//.test(url);

// Link scritti nel CMS: passano solo quelli relativi o con protocolli innocui (niente "javascript:").
// I browser ignorano spazi e caratteri di controllo nel protocollo, quindi si tolgono prima del controllo.
const PROTOCOLLI_SICURI = ['http', 'https', 'mailto', 'tel'];
export function urlSicuro(url?: string | null): string | undefined {
  const pulito = url?.trim();
  if (!pulito) return undefined;
  const protocollo = pulito.replace(/[\u0000- \u007f]/g, '').match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
  return !protocollo || PROTOCOLLI_SICURI.includes(protocollo.toLowerCase()) ? pulito : undefined;
}

// Accetta https://youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID oppure l'ID nudo.
export function youtubeId(url: string): string | undefined {
  const m = url.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(url.trim()) ? url.trim() : undefined;
}
