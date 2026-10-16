import { APIError, type CollectionConfig, type PayloadRequest, type Where } from 'payload'

import { isAdmin, isAdminField, isAdminOrSelf } from '../access'
import { stessaLingua } from '../hooks/stessaLingua'

/**
 * Dopo l'operazione resterebbe almeno un amministratore? Si guarda l'operazione intera (anche
 * "elimina" o "modifica" su più utenti insieme): Payload elabora gli utenti in parallelo, e un
 * controllo per singolo utente vedrebbe ancora gli altri amministratori.
 */
async function controllaUltimoAmministratore(req: PayloadRequest, filtro: Where) {
  const toccati = await stessaLingua(req, () =>
    req.payload.find({ collection: 'users', where: { and: [filtro, { role: { equals: 'admin' } }] }, depth: 0, pagination: false, req }),
  )
  if (toccati.docs.length === 0) return
  const restano = await stessaLingua(req, () =>
    req.payload.count({ collection: 'users', where: { role: { equals: 'admin' }, id: { not_in: toccati.docs.map((u) => u.id) } }, req }),
  )
  if (restano.totalDocs === 0) {
    throw new APIError("Resterebbe senza amministratori: nomina prima un altro amministratore.", 400, undefined, true)
  }
}

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
    // Sbloccare un account bloccato dai tentativi sbagliati annullerebbe la protezione: solo l'amministratore.
    unlock: isAdmin,
  },
  hooks: {
    beforeValidate: [
      // Il primo utente deve poter gestire tutto: senza questo diventerebbe un editor e nessuno potrebbe creare altri utenti.
      // In produzione non si crea dal pannello (chiunque arrivi per primo sulla pagina diventerebbe amministratore):
      // si usa npm run admin:crea, che lo segnala con context.primoAmministratore.
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data
        const { totalDocs } = await stessaLingua(req, () => req.payload.count({ collection: 'users', req }))
        if (totalDocs > 0) return data
        if (process.env.NODE_ENV === 'production' && !req.context.primoAmministratore) {
          throw new APIError('Il primo amministratore si crea con npm run admin:crea sul server.', 403, undefined, true)
        }
        return { ...data, role: 'admin' }
      },
    ],
    beforeOperation: [
      async ({ args, operation, req }) => {
        const cancella = operation === 'delete'
        const declassa = operation === 'update' && args.data?.role !== undefined && args.data.role !== 'admin'
        if (cancella || declassa) {
          // Un solo utente arriva con "id", più utenti con "where".
          const id = 'id' in args ? args.id : undefined
          await controllaUltimoAmministratore(req, id !== undefined ? { id: { equals: id } } : (args.where ?? {}))
        }
        return args
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
      // Copiato anche nel token di accesso. I permessi però usano l'utente che Payload rilegge dal
      // database a ogni richiesta: un cambio di ruolo vale subito.
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
