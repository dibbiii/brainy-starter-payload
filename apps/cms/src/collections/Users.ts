import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminField, isAdminOrSelf } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Utente', plural: 'Utenti' },
  admin: {
    useAsTitle: 'email',
    group: 'Amministrazione',
  },
  auth: true,
  access: {
    // Gli utenti li gestisce solo l'amministratore; ognuno può leggere e modificare se stesso (per cambiare la propria password).
    create: isAdmin,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [
      // Il primo utente, creato dal pannello, deve poter gestire tutto:
      // senza questo diventerebbe un editor e nessuno potrebbe creare altri utenti.
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data
        const { totalDocs } = await req.payload.count({ collection: 'users', req })
        return totalDocs === 0 ? { ...data, role: 'admin' } : data
      },
    ],
  },
  fields: [
    {
      name: 'role',
      label: 'Ruolo',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      // Salvato nel token di accesso: i controlli sui permessi non devono interrogare il database.
      saveToJWT: true,
      options: [
        { label: 'Amministratore', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      access: { create: isAdminField, update: isAdminField },
      admin: {
        description:
          "L'amministratore gestisce tutto, inclusi utenti e aspetto. L'editor gestisce contenuti, media, dati del sito, menu e sponsor.",
      },
    },
  ],
}
