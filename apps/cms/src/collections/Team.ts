import type { CollectionConfig } from 'payload'

import { anyone, conAccount, isStaff } from '../access'
import { obbligatorioTesto } from '../fields/obbligatorio'
import { slugField } from '../fields/slug'

export const Team: CollectionConfig = {
  slug: 'team',
  labels: { singular: 'Persona', plural: 'Team' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'group', 'order'],
    group: 'Contenuti',
  },
  // Numero piccolo = prima; a parità di numero, in ordine alfabetico.
  defaultSort: ['order', 'name'],
  access: {
    // Le persone sono dati pubblici del sito. Salvate direttamente, senza bozze: le modifiche si vedono alla ricostruzione successiva.
    read: anyone,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  fields: [
    // Il nome di una persona non si traduce.
    { name: 'name', label: 'Nome', type: 'text', required: true },
    {
      name: 'role',
      label: 'Ruolo',
      type: 'text',
      required: true,
      localized: true,
      validate: obbligatorioTesto,
    },
    { name: 'photo', label: 'Foto', type: 'upload', relationTo: 'media' },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      // Non leggibile dall'API anonima (raccolta di indirizzi per lo spam): lo snapshot la legge con la chiave.
      access: { read: conAccount },
    },
    { name: 'bio', label: 'Breve presentazione', type: 'textarea', localized: true },
    {
      // Non è tradotto: è la chiave con cui il blocco Team filtra le persone.
      name: 'group',
      label: 'Gruppo',
      type: 'text',
      admin: {
        description:
          'Facoltativo. Serve a mostrare gruppi diversi in sezioni diverse. Es. Cariche, Responsabili di settore',
      },
    },
    {
      name: 'order',
      label: 'Ordine',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        description: 'Numero piccolo = prima. A parità di numero, in ordine alfabetico',
      },
    },
    slugField({ da: 'name' }),
  ],
}
