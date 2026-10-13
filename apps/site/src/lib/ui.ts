// Gruppi di classi Tailwind riusati in più componenti.
// Tailwind legge anche i file .ts, quindi le classi qui dentro vengono generate.

// Colonna centrale del sito
export const wrap = 'max-w-wrap mx-auto px-gutter';

// Sezione di pagina. "section" e "section--tint" sono solo segnaposto (senza stili)
// usati dai selettori fratello: due sezioni consecutive non raddoppiano lo spazio,
// a meno che una delle due abbia lo sfondo colorato.
export const section = 'section py-section [.section:not(.section--tint)+&]:pt-0';
export const sectionTint = 'section section--tint bg-tint py-section';

export const lead = 'text-[1.2rem] text-muted max-w-measure';

// Testo lungo (markdown del CMS): liste e ultimo paragrafo
export const prose =
  'max-w-measure [&>:last-child]:mb-0 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-[1.25em] [&_ol]:pl-[1.25em] [&_li]:mb-[0.35em]';

// Il segnavia: tre bande rosso-bianco-rosso, il segno dei sentieri alpini
export const segnavia =
  'block w-14 h-[0.9rem] mb-5 bg-[linear-gradient(var(--c-accent)_0_34%,var(--c-paper)_34%_66%,var(--c-accent)_66%)]';

// Pulsanti: base + variante (+ taglia). Padding separato per poterlo sostituire.
const buttonBase =
  'inline-block font-semibold rounded-brand no-underline cursor-pointer transition-colors duration-150 motion-reduce:transition-none';
export const buttonPad = 'px-[1.4em] py-[0.8em]';
export const buttonPadSm = 'px-[1em] py-[0.55em] text-[0.95rem] whitespace-nowrap';
export const button = `${buttonBase} bg-accent text-paper hover:text-paper hover:bg-[color-mix(in_srgb,var(--c-accent)_82%,var(--c-ink))]`;
export const buttonGhost = `${buttonBase} bg-transparent text-inherit shadow-[inset_0_0_0_2px_currentColor] hover:bg-paper/12 hover:text-inherit`;
