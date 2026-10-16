// Crea il primo amministratore (in produzione il pannello non lo permette, vedi collections/Users.ts).
//
// Uso: npm run admin:crea   (chiede l'email; oppure ADMIN_EMAIL nell'ambiente)
// La password si genera qui e si mostra una volta sola: cambiala dal pannello dopo il primo accesso.
import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline/promises'

import { getPayload } from 'payload'

import config from '../src/payload.config'

const payload = await getPayload({ config })
if ((await payload.count({ collection: 'users' })).totalDocs > 0) {
  console.error('Esiste già almeno un utente: gli altri si creano dal pannello (Amministrazione → Utenti).')
  process.exit(1)
}

let email = process.env.ADMIN_EMAIL?.trim()
if (!email) {
  const domande = createInterface({ input: process.stdin, output: process.stdout })
  email = (await domande.question('Email del primo amministratore: ')).trim()
  domande.close()
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(`"${email}" non sembra un indirizzo email.`)
  process.exit(1)
}

const password = randomBytes(18).toString('base64url')
await payload.create({ collection: 'users', data: { email, password, role: 'admin' }, context: { primoAmministratore: true } })
console.log(`Amministratore creato: ${email}\nPassword (mostrata solo ora): ${password}`)
process.exit(0)
