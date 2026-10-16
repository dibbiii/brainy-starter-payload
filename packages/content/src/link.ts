// Link scritti dagli editor: indirizzi web, email, telefono, percorsi del sito o ancore.
// È la stessa regola del `pattern` sui campi link della base Sveltia; il sito poi li ripulisce di nuovo (urlSicuro).
export const linkValido = (url: string): boolean => /^(https?:\/\/|mailto:|tel:|\/|#)/.test(url)

export const messaggioLink = 'Il link deve iniziare con https://, mailto:, tel:, / oppure #'
