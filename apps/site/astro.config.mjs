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
  // Niente evidenziazione del codice: Shiki usa attributi style="" che la CSP blocca.
  markdown: { syntaxHighlight: false },
  // CSP in un <meta>: Astro aggiunge da solo gli hash di script e stili (solo in build, non in dev).
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        'frame-src https://www.youtube-nocookie.com',
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
