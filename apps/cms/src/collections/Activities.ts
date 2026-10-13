import type { CollectionConfig } from 'payload'

import { isStaff, publishedOrStaff } from '../access'
import { obbligatorioTesto } from '../fields/obbligatorio'
import { sectionsField } from '../fields/sections'
import { slugField } from '../fields/slug'

// Un'attività è una disciplina, una gara, un corso... Per un cliente cambiano solo le etichette (es. "Discipline", "Gare") e, nelle Impostazioni, il nome e l'indirizzo della sezione.
export const Activities: CollectionConfig = {
  slug: 'activities',
  labels: { singular: 'Attività', plural: 'Attività' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'order', '_status', 'updatedAt'],
    group: 'Contenuti',
  },
  // Numero piccolo = prima; a parità di numero, in ordine alfabetico.
  defaultSort: ['order', 'title'],
  access: {
    // I visitatori vedono solo le attività pubblicate; le bozze sono visibili a chi ha un account.
    read: publishedOrStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  versions: { drafts: true },
  fields: [
    {
      name: 'title',
      label: 'Nome',
      type: 'text',
      required: true,
      localized: true,
      validate: obbligatorioTesto,
    },
    {
      name: 'description',
      label: 'Breve descrizione',
      type: 'textarea',
      localized: true,
      admin: { description: 'Compare in cima alla pagina e nei motori di ricerca' },
    },
    {
      name: 'image',
      label: 'Immagine',
      type: 'upload',
      relationTo: 'media',
      admin: { description: "Scheda nell'elenco e immagine in cima alla pagina" },
    },
    {
      name: 'managers',
      label: 'Responsabili',
      type: 'relationship',
      relationTo: 'team',
      hasMany: true,
      admin: {
        description: "Persone dell'elenco Team. Se una persona viene eliminata, sparisce da qui",
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
    sectionsField,
    slugField(),
  ],
}
