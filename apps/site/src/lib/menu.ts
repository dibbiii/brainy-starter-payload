// Il menu di navigazione, con le attività aggiunte al sottomenu delle voci che lo chiedono
// (campo "Mostra le attività come sottomenu" in Impostazioni → Menu).
import { menu, type MenuItem } from './site';
import { allActivities, activityUrl } from './activities';

export async function resolvedMenu(): Promise<MenuItem[]> {
  if (!menu.some((item) => item.activities_submenu)) return menu;
  const activities = (await allActivities()).map((a) => ({ label: a.data.title, url: activityUrl(a) }));
  return menu.map((item) =>
    item.activities_submenu ? { ...item, children: [...(item.children ?? []), ...activities] } : item,
  );
}
