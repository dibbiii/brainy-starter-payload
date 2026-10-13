// Impostazioni globali modificabili dal CMS (Impostazioni → …).
// I tipi qui sotto rispecchiano i campi in public/admin/config.yml.
import siteData from '../data/site.json';
import themeData from '../data/theme.json';
import menuData from '../data/menu.json';
import sponsorsData from '../data/sponsors.json';

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

export const site = siteData as Site;
export const theme = themeData as {
  primary: string; accent: string; ink: string; paper: string;
  heading_font: string; body_font: string; corners: string;
};
export const menu = ((menuData as { items?: MenuItem[] }).items ?? []);
export const sponsors = ((sponsorsData as { items?: Sponsor[] }).items ?? []);
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
