import type { Access, FieldAccess, PayloadRequest } from 'payload'

// Funzioni di accesso condivise. Il ruolo arriva dal token dell'utente (saveToJWT).
// Non c'è un ruolo "ospite": chi non ha fatto l'accesso ha req.user vuoto.
// req.user può essere anche una chiave di lettura (collezione chiavi-api): non ha ruolo né accesso al pannello.

/** Il ruolo, solo per gli utenti del pannello. */
const ruolo = (req: PayloadRequest) => (req.user?.collection === 'users' ? req.user.role : undefined)

/** Chiunque, anche senza account (per i dati pubblici). */
export const anyone: Access = () => true

/** Qualunque utente del pannello: amministratore o editor (non le chiavi di lettura). */
export const isStaff: Access = ({ req }) => ruolo(req) !== undefined

/** Gli utenti del pannello vedono tutto, bozze incluse; gli altri (chiavi comprese) solo i documenti pubblicati. */
export const publishedOrStaff: Access = ({ req }) => (ruolo(req) ? true : { _status: { equals: 'published' } })

/** Per i campi riservati (es. le email del Team): utenti del pannello e chiavi di lettura, non i visitatori. */
export const conAccount: FieldAccess = ({ req }) => Boolean(req.user)

/** Solo l'amministratore. */
export const isAdmin: Access = ({ req }) => ruolo(req) === 'admin'

/** L'amministratore su tutto; gli altri utenti solo sul proprio documento. */
export const isAdminOrSelf: Access = ({ req }) => {
  // Una chiave di lettura ha id propri: con { id } leggerebbe l'utente che ha lo stesso numero.
  if (req.user?.collection !== 'users') return false
  if (req.user.role === 'admin') return true
  return { id: { equals: req.user.id } }
}

/** Come isAdmin, per limitare un singolo campo (es. il ruolo o lo slug dopo la creazione). */
export const isAdminField: FieldAccess = ({ req }) => ruolo(req) === 'admin'
