import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import site from './src/data/site.json' with { type: 'json' };

// La porta arriva dal .env alla radice del repository (le variabili già presenti
// nell'ambiente hanno la precedenza); senza il file si usa quella predefinita.
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  // nessun .env
}

// L'URL del sito arriva dalle impostazioni modificabili dal CMS,
// così per un nuovo cliente non serve toccare questo file.
export default defineConfig({
  site: site.url,
  server: { port: Number(process.env.SITE_PORT) || 4322 },
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
