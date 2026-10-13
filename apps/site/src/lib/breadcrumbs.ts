// Briciole di pane: dal percorso della pagina e dal menu ricava
// "Home › Sezione › Pagina". Usato da PageHeader.
import { menu } from './site';

export interface Crumb { label: string; url?: string }

// "/la-societa/" e "/la-societa" devono risultare uguali; "/" resta "/".
const clean = (url: string) => url.replace(/\/$/, '') || '/';

export function breadcrumbs(path: string, title: string): Crumb[] {
  const here = clean(path);
  const crumbs: Crumb[] = [{ label: 'Home', url: '/' }];

  // Il genitore è la voce di menu che ha tra i figli la pagina corrente.
  // Le voci con "#" puntano a un punto di una pagina, non a una pagina: si saltano.
  const parent = menu.find((item) =>
    item.children?.some((child) => !child.url.includes('#') && clean(child.url) === here),
  );
  if (parent) crumbs.push({ label: parent.label, url: parent.url });

  crumbs.push({ label: title });
  return crumbs;
}
