import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'

// Chiavi per i programmi che leggono il CMS (lo snapshot del sito). Non hanno password e non entrano
// nel pannello; vedono solo i contenuti pubblicati, più i campi riservati come le email del Team.
export const ChiaviApi: CollectionConfig = {
  slug: 'chiavi-api',
  labels: { singular: 'Chiave di lettura', plural: 'Chiavi di lettura' },
  admin: {
    useAsTitle: 'nome',
    group: 'Amministrazione',
    description: 'Per lo snapshot del sito: crea la chiave con npm run chiave:snapshot e mettila in CMS_API_KEY.',
  },
  auth: { useAPIKey: true, disableLocalStrategy: true },
  access: {
    create: isAdmin,
    // Una chiave legge solo se stessa: serve a /api/chiavi-api/me, con cui lo snapshot controlla che sia valida.
    read: (args) =>
      isAdmin(args) || (args.req.user?.collection === 'chiavi-api' ? { id: { equals: args.req.user.id } } : false),
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [{ name: 'nome', label: 'Nome', type: 'text', required: true }],
}
