import { getCollection, type CollectionEntry } from 'astro:content';
export const PER_PAGE = 12;
export async function publishedNews() {
  return (await getCollection('news', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// Anno di una news (le date sono salvate senza orario: si usa UTC per non cambiare anno col fuso)
export const yearOf = (p: CollectionEntry<'news'>) => p.data.date.getUTCFullYear();

// Gli anni in cui c'è almeno una news, dal più recente
export const yearsOf = (posts: CollectionEntry<'news'>[]) =>
  [...new Set(posts.map(yearOf))].sort((a, b) => b - a);
