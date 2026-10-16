// Contratto dei dati tra CMS e sito: la forma dei contenuti nello snapshot.
// Lo usano lo script che aggiorna i contenuti (per validare ciò che arriva dal CMS) e il sito Astro
// (per leggerli), così la definizione è una sola. La forma è quella della base: percorsi dei file
// come "/media/x.svg", testi alternativi in campi "*_alt", collegamenti tra contenuti per slug.
import { z } from 'zod'

// Un campo di testo vuoto vale come assente.
const optStr = z.string().nullish().transform((v) => v || undefined)

// --- Blocchi delle sezioni: uno per ogni blocco del CMS (apps/cms/src/blocks) ---------------------
// I testi formattati (`content`) sono già HTML.
const hero = z.object({
  type: z.literal('hero'),
  title: z.string(),
  subtitle: optStr,
  image: optStr,
  image_alt: optStr,
  button_label: optStr,
  button_url: optStr,
  size: z.enum(['large', 'medium']).default('large'),
})
const text = z.object({ type: z.literal('text'), title: optStr, content: z.string() })
const textImage = z.object({
  type: z.literal('text_image'),
  title: optStr,
  content: z.string(),
  image: z.string(),
  image_alt: optStr,
  image_side: z.enum(['left', 'right']).default('right'),
})
const cards = z.object({
  type: z.literal('cards'),
  title: optStr,
  intro: optStr,
  items: z.array(
    z.object({ title: z.string(), highlight: optStr, text: optStr, image: optStr, image_alt: optStr, url: optStr }),
  ).default([]),
})
const activitiesList = z.object({
  type: z.literal('activities'),
  title: optStr,
  intro: optStr,
  link_label: optStr,
  link_url: optStr,
  show_managers: z.boolean().nullish().default(true),
})
const team = z.object({
  type: z.literal('team'),
  title: optStr,
  intro: optStr,
  limit: z.number().default(0),
  layout: z.enum(['grid', 'officers', 'compact']).default('grid'),
  group: optStr,
})
const sponsors = z.object({ type: z.literal('sponsors'), title: optStr, intro: optStr })
const gallery = z.object({
  type: z.literal('gallery'),
  title: optStr,
  images: z.array(z.object({ image: z.string(), image_alt: optStr, caption: optStr })).default([]),
})
const cta = z.object({
  type: z.literal('cta'),
  title: z.string(),
  text: optStr,
  button_label: z.string(),
  button_url: z.string(),
})
const documents = z.object({
  type: z.literal('documents'),
  title: optStr,
  files: z.array(z.object({ label: z.string(), file: z.string(), year: optStr })).default([]),
  sort: z.enum(['entered', 'newest', 'oldest']).default('entered'),
  show_open: z.boolean().nullish().default(false),
})
const latestNews = z.object({ type: z.literal('latest_news'), title: optStr, count: z.number().default(3) })
const video = z.object({ type: z.literal('video'), title: optStr, url: z.string() })
const contacts = z.object({
  type: z.literal('contacts'),
  title: optStr,
  intro: optStr,
  image: optStr,
  image_alt: optStr,
  image_caption: optStr,
})
const stats = z.object({
  type: z.literal('stats'),
  title: optStr,
  layout: z.enum(['row', 'cards']).default('row'),
  items: z.array(z.object({ value: z.string(), label: z.string() })).min(2).max(4),
})
const timeline = z.object({
  type: z.literal('timeline'),
  title: optStr,
  start: z.string(),
  end: z.string(),
})

export const section = z.discriminatedUnion('type', [
  hero, text, textImage, cards, activitiesList, team, sponsors, gallery, cta, stats, timeline, documents, latestNews, video, contacts,
])
export type Section = z.infer<typeof section>

// --- Contenuti -------------------------------------------------------------------------------------

export const pageData = z.object({
  title: z.string(),
  description: optStr,
  show_title: z.boolean().nullish().default(true),
  show_share: z.boolean().nullish().default(false),
  header_image: optStr,
  header_image_alt: optStr,
  sections: z.array(section).nullish().default([]),
})

// "managers" contiene gli slug delle persone del Team.
export const activityData = z.object({
  title: z.string(),
  description: optStr,
  image: optStr,
  image_alt: optStr,
  managers: z.array(z.string()).nullish().transform((v) => v ?? []),
  order: z.number().nullish().transform((v) => v ?? 0),
  sections: z.array(section).nullish().default([]),
})

// Nello snapshot ci sono solo le news pubblicate; `draft` resta per compatibilità con il sito.
export const newsData = z.object({
  title: z.string(),
  date: z.coerce.date(),
  excerpt: optStr,
  cover: optStr,
  cover_alt: optStr,
  activity: optStr,
  attachments: z.array(z.object({ label: z.string(), file: z.string() })).nullish().default([]),
  draft: z.boolean().nullish().default(false),
  body: z.string(),
})

export const teamData = z.object({
  name: z.string(),
  role: z.string(),
  photo: optStr,
  photo_alt: optStr,
  email: optStr,
  bio: optStr,
  group: optStr,
  order: z.number().nullish().transform((v) => v ?? 0),
})

// --- Impostazioni ----------------------------------------------------------------------------------

export const siteData = z.object({
  name: z.string(),
  tagline: optStr,
  url: z.string(),
  logo: optStr,
  logo_alt: optStr,
  show_name_with_logo: z.boolean().nullish(),
  header_subtitle: optStr,
  header_button_label: optStr,
  header_button_url: optStr,
  page_header_style: z.enum(['simple', 'band']).nullish(),
  og_image: optStr,
  og_image_alt: optStr,
  email: optStr,
  phone: optStr,
  address: optStr,
  tax_id: optStr,
  socials: z.array(z.object({ platform: z.string(), url: z.string() })).nullish(),
  privacy_url: optStr,
  footer_note: optStr,
  footer_logo: optStr,
  footer_logo_alt: optStr,
  footer_columns: z
    .array(
      z.object({
        title: z.string(),
        from_activities: z.boolean().nullish(),
        links: z.array(z.object({ label: z.string(), url: z.string() })).nullish(),
      }),
    )
    .nullish(),
  activities_label: optStr,
  activities_path: optStr,
  activities_more_title: optStr,
  activities_all_label: optStr,
  show_section_nav: z.boolean().nullish(),
  show_share_links: z.boolean().nullish(),
  news_featured: z.boolean().nullish(),
  news_sidebar: z.boolean().nullish(),
  news_box_title: optStr,
  news_box_text: optStr,
  news_box_button_label: optStr,
  news_box_button_url: optStr,
})
export type SiteData = z.infer<typeof siteData>

export const themeData = z.object({
  primary: z.string(),
  accent: z.string(),
  ink: z.string(),
  paper: z.string(),
  heading_font: z.string(),
  body_font: z.string(),
  corners: z.string(),
})

export const menuData = z.object({
  items: z
    .array(
      z.object({
        label: z.string(),
        url: optStr,
        activities_submenu: z.boolean().nullish(),
        children: z.array(z.object({ label: z.string(), url: z.string() })).nullish(),
      }),
    )
    .default([]),
})

export const sponsorsData = z.object({
  items: z
    .array(
      z.object({
        name: z.string(),
        logo: optStr,
        logo_alt: optStr,
        url: optStr,
        tier: z.enum(['main', 'partner', 'institutional']).default('partner'),
      }),
    )
    .default([]),
  show_in_footer: z.boolean().nullish(),
})

// --- Snapshot --------------------------------------------------------------------------------------

/** Un contenuto dello snapshot: l'identificatore è lo slug. */
export const entry = <T extends z.ZodType>(data: T) => z.object({ id: z.string(), data })

/** Tutto ciò che il sito legge per una lingua. */
export const snapshotLingua = z.object({
  pages: z.array(entry(pageData)),
  activities: z.array(entry(activityData)),
  news: z.array(entry(newsData)),
  team: z.array(entry(teamData)),
  site: siteData,
  theme: themeData,
  menu: menuData,
  sponsors: sponsorsData,
})

/** Informazioni sull'ultimo aggiornamento (file meta.json). */
export const snapshotMeta = z.object({
  versione: z.literal(1),
  // "in-aggiornamento" mentre si copiano i file: chi legge deve rifiutare uno snapshot in quello stato.
  stato: z.enum(['ok', 'in-aggiornamento']),
  generatoIl: z.string(),
  sorgente: z.string(),
  lingue: z.array(z.string()),
  media: z.array(z.string()),
  conteggi: z.record(z.string(), z.record(z.string(), z.number())),
})
