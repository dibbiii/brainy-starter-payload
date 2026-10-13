// La favicon è un file separato dalla pagina, quindi non può leggere le
// variabili CSS del tema. La generiamo qui da theme.json: cambiando i colori
// dal CMS cambia anche la favicon. Nel build diventa il file statico /favicon.svg.
import type { APIRoute } from 'astro';
import { theme } from '../lib/site';

export const GET: APIRoute = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" fill="${theme.primary}"/>
<rect x="4" y="9" width="24" height="5" fill="${theme.accent}"/>
<rect x="4" y="14" width="24" height="4" fill="${theme.paper}"/>
<rect x="4" y="18" width="24" height="5" fill="${theme.accent}"/>
</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
