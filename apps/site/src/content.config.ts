// Schema dei contenuti. È il "gemello" di public/admin/config.yml:
// ogni campo definito là deve esistere qui (e viceversa), altrimenti
// la build si ferma con un errore che dice quale campo non torna.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Il pannello salva i campi vuoti come "" oppure null (e con `omit_empty_optional_fields` li
// omette): li trattiamo come assenti. Vale anche per i file scritti a mano.
const optStr = z.string().nullish().transform((v) => v || undefined);

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: optStr,
    cover: optStr,
    cover_alt: optStr,
    activity: optStr,
    attachments: z.array(z.object({ label: z.string(), file: z.string() })).nullish().default([]),
    draft: z.boolean().nullish().default(false),
  }),
});

// --- Blocchi del page builder: uno per ogni "type" in config.yml ---
const hero = z.object({
  type: z.literal('hero'),
  title: z.string(),
  subtitle: optStr,
  image: optStr,
  button_label: optStr,
  button_url: optStr,
  size: z.enum(['large', 'medium']).default('large'),
});
const text = z.object({ type: z.literal('text'), title: optStr, content: z.string() });
const textImage = z.object({
  type: z.literal('text_image'),
  title: optStr,
  content: z.string(),
  image: z.string(),
  image_alt: optStr,
  image_side: z.enum(['left', 'right']).default('right'),
});
const cards = z.object({
  type: z.literal('cards'),
  title: optStr,
  intro: optStr,
  items: z.array(
    z.object({ title: z.string(), highlight: optStr, text: optStr, image: optStr, url: optStr }),
  ),
});
const activitiesList = z.object({
  type: z.literal('activities'),
  title: optStr,
  intro: optStr,
  link_label: optStr,
  link_url: optStr,
  show_managers: z.boolean().nullish().default(true),
});
const team = z.object({
  type: z.literal('team'),
  title: optStr,
  intro: optStr,
  limit: z.number().default(0),
  layout: z.enum(['grid', 'officers', 'compact']).default('grid'),
  group: optStr,
});
const sponsors = z.object({ type: z.literal('sponsors'), title: optStr, intro: optStr });
const gallery = z.object({
  type: z.literal('gallery'),
  title: optStr,
  images: z.array(z.object({ image: z.string(), caption: optStr })),
});
const cta = z.object({
  type: z.literal('cta'),
  title: z.string(),
  text: optStr,
  button_label: z.string(),
  button_url: z.string(),
});
const documents = z.object({
  type: z.literal('documents'),
  title: optStr,
  files: z.array(z.object({ label: z.string(), file: z.string(), year: optStr })),
  sort: z.enum(['entered', 'newest', 'oldest']).default('entered'),
  show_open: z.boolean().nullish().default(false),
});
const latestNews = z.object({ type: z.literal('latest_news'), title: optStr, count: z.number().default(3) });
const video = z.object({ type: z.literal('video'), title: optStr, url: z.string() });
const contacts = z.object({
  type: z.literal('contacts'),
  title: optStr,
  intro: optStr,
  image: optStr,
  image_alt: optStr,
  image_caption: optStr,
});
const stats = z.object({
  type: z.literal('stats'),
  title: optStr,
  layout: z.enum(['row', 'cards']).default('row'),
  items: z.array(z.object({ value: z.string(), label: z.string() })).min(2).max(4),
});
const timeline = z.object({
  type: z.literal('timeline'),
  title: optStr,
  start: z.string(),
  end: z.string(),
});

export const section = z.discriminatedUnion('type', [
  hero, text, textImage, cards, activitiesList, team, sponsors, gallery, cta, stats, timeline, documents, latestNews, video, contacts,
]);
export type Section = z.infer<typeof section>;

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: optStr,
    show_title: z.boolean().nullish().default(true),
    show_share: z.boolean().nullish().default(false),
    header_image: optStr,
    header_image_alt: optStr,
    sections: z.array(section).nullish().default([]),
  }),
});

// Un'attività (disciplina, gara, corso) = un file in src/content/activities.
// "managers" contiene gli id (nomi dei file) delle persone del Team.
const activities = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/activities' }),
  schema: z.object({
    title: z.string(),
    description: optStr,
    image: optStr,
    image_alt: optStr,
    managers: z.array(z.string()).nullish().transform((v) => v ?? []),
    order: z.number().nullish().transform((v) => v ?? 0),
    sections: z.array(section).nullish().default([]),
  }),
});

// Una persona = un file in src/content/team. Il nome del file (l'"id") resta fisso
// anche se si cambia il nome: è quello che le altre collezioni usano per riferirsi alla persona.
const teamMembers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/team' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    photo: optStr,
    email: optStr,
    bio: optStr,
    group: optStr,
    order: z.number().nullish().transform((v) => v ?? 0),
  }),
});

export const collections = { news, pages, activities, team: teamMembers };
