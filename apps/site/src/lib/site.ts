// Impostazioni globali modificabili dal CMS (Impostazioni → …).
// I tipi qui sotto rispecchiano i campi in public/admin/config.yml.
import siteData from '../data/site.json';
import themeData from '../data/theme.json';
import menuData from '../data/menu.json';
import sponsorsData from '../data/sponsors.json';
import { urlSicuro } from './format';

export interface Site {
  name: string;
  tagline?: string;
  url: string;
  logo?: string;
  show_name_with_logo?: boolean;
  header_subtitle?: string;
  header_button_label?: string;
  header_button_url?: string;
  page_header_style?: 'simple' | 'band';
  og_image?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  socials?: { platform: string; url: string }[];
  privacy_url?: string;
  footer_note?: string;
  footer_logo?: string;
  activities_label?: string;
  activities_path?: string;
  activities_more_title?: string;
  activities_all_label?: string;
  show_section_nav?: boolean;
  show_share_links?: boolean;
  news_featured?: boolean;
  news_sidebar?: boolean;
  news_box_title?: string;
  news_box_text?: string;
  news_box_button_label?: string;
  news_box_button_url?: string;
  footer_columns?: { title: string; links?: { label: string; url: string }[]; from_activities?: boolean }[];
}
export interface MenuItem {
  label: string;
  url?: string;
  children?: { label: string; url: string }[];
  activities_submenu?: boolean;
}
export interface Sponsor { name: string; logo?: string; url?: string; tier: 'main' | 'partner' | 'institutional' }

// I link scritti nel CMS si ripuliscono qui una volta sola (vedi urlSicuro).
const linkSicuri = <T extends { url?: string }>(voci: T[] = []) =>
  voci.flatMap((v) => {
    const url = urlSicuro(v.url);
    return url ? [{ ...v, url }] : [];
  });

const sitoGrezzo = siteData as Site;
export const site: Site = {
  ...sitoGrezzo,
  header_button_url: urlSicuro(sitoGrezzo.header_button_url),
  privacy_url: urlSicuro(sitoGrezzo.privacy_url),
  news_box_button_url: urlSicuro(sitoGrezzo.news_box_button_url),
  socials: linkSicuri(sitoGrezzo.socials),
  footer_columns: sitoGrezzo.footer_columns?.map((c) => ({ ...c, links: linkSicuri(c.links) })),
};

// Un colore non valido non deve poter uscire dal CSS: si usa quello della base.
const colore = (valore: string, riserva: string) => (/^#[0-9a-f]{6}$/i.test(valore) ? valore : riserva);
const temaGrezzo = themeData as {
  primary: string; accent: string; ink: string; paper: string;
  heading_font: string; body_font: string; corners: string;
};
export const theme = {
  ...temaGrezzo,
  primary: colore(temaGrezzo.primary, '#24493d'),
  accent: colore(temaGrezzo.accent, '#c62d1f'),
  ink: colore(temaGrezzo.ink, '#1b2430'),
  paper: colore(temaGrezzo.paper, '#f5f6f3'),
};

// WCAG 1.4.3: almeno 4.5:1 tra testo e sfondo. Il pannello non lo controlla, lo segnala la build.
const luminanza = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrasto = (a: string, b: string) => {
  const [chiaro, scuro] = [luminanza(a), luminanza(b)].sort((x, y) => y - x);
  return (chiaro + 0.05) / (scuro + 0.05);
};
for (const [testo, sfondo, dove] of [
  [theme.ink, theme.paper, 'il testo sullo sfondo'],
  [theme.paper, theme.accent, 'pulsanti e link'],
  [theme.paper, theme.primary, 'piè di pagina e copertine'],
]) {
  const rapporto = contrasto(testo, sfondo);
  if (rapporto < 4.5) {
    console.warn(`[tema] Contrasto ${rapporto.toFixed(2)}:1 per ${dove} (${testo} su ${sfondo}): serve almeno 4.5:1.`);
  }
}

export const menu = ((menuData as { items?: MenuItem[] }).items ?? []).map((item) => ({
  ...item,
  url: urlSicuro(item.url),
  children: linkSicuri(item.children),
}));
export const sponsors = ((sponsorsData as { items?: Sponsor[] }).items ?? []).map((s) => ({ ...s, url: urlSicuro(s.url) }));
export const sponsorsInFooter = (sponsorsData as { show_in_footer?: boolean }).show_in_footer !== false;

// Famiglie di caratteri disponibili (tutti self-hosted tramite Fontsource).
const fonts: Record<string, string> = {
  barlow: "'Barlow Condensed', 'Arial Narrow', sans-serif",
  archivo: "'Archivo Variable', 'Helvetica Neue', Arial, sans-serif",
  fraunces: "'Fraunces Variable', Georgia, serif",
  source_serif: "'Source Serif 4 Variable', Georgia, serif",
  source: "'Source Sans 3 Variable', 'Segoe UI', Roboto, sans-serif",
  atkinson: "'Atkinson Hyperlegible', 'Segoe UI', Verdana, sans-serif",
  lora: "'Lora Variable', Georgia, serif",
};

export function themeCss(): string {
  const t = theme;
  return `:root{
  --c-primary:${t.primary};
  --c-accent:${t.accent};
  --c-ink:${t.ink};
  --c-paper:${t.paper};
  --f-heading:${fonts[t.heading_font] ?? fonts.barlow};
  --f-body:${fonts[t.body_font] ?? fonts.source};
  --radius:${t.corners === 'soft' ? '6px' : '0px'};
}`;
}

export const tierLabels: Record<Sponsor['tier'], string> = {
  main: 'Sponsor principali',
  institutional: 'Con il supporto di',
  partner: 'Partner',
};
