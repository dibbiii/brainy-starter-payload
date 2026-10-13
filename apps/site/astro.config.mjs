import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import site from './src/data/site.json' with { type: 'json' };

// L'URL del sito arriva dalle impostazioni modificabili dal CMS,
// così per un nuovo cliente non serve toccare questo file.
export default defineConfig({
  site: site.url,
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
