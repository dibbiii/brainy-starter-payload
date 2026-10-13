import type { Access, FieldAccess } from 'payload'

// Funzioni di accesso condivise. Il ruolo arriva dal token dell'utente (saveToJWT).
// Non c'è un ruolo "ospite": chi non ha fatto l'accesso ha req.user vuoto.

/** Chiunque, anche senza account (per i dati pubblici). */
export const anyone: Access = () => true

/** Qualunque utente con account: amministratore o editor. */
export const isStaff: Access = ({ req }) => Boolean(req.user)

/** Chi ha un account vede tutto, bozze incluse; gli altri solo i documenti pubblicati. */
export const publishedOrStaff: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }

/** Solo l'amministratore. */
export const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

/** L'amministratore su tutto; gli altri utenti solo sul proprio documento. */
export const isAdminOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  return { id: { equals: req.user.id } }
}

/** Come isAdmin, per limitare un singolo campo (es. il ruolo o lo slug dopo la creazione). */
export const isAdminField: FieldAccess = ({ req }) => req.user?.role === 'admin'
