import type { CollectionConfig } from 'payload'

import { isStaff, publishedOrStaff } from '../access'
import { obbligatorioFile, obbligatorioTesto, obbligatorioTestoFormattato } from '../fields/obbligatorio'
import { slugField } from '../fields/slug'

export const News: CollectionConfig = {
  slug: 'news',
  labels: { singular: 'News', plural: 'News' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', '_status'],
    group: 'Contenuti',
  },
  defaultSort: '-date',
  access: {
    // I visitatori vedono solo le news pubblicate; le bozze sono visibili a chi ha un account.
    // Le bozze di Payload sostituiscono il campo «Bozza» da spuntare a mano della base.
    read: publishedOrStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  versions: { drafts: true },
  fields: [
    {
      name: 'title',
      label: 'Titolo',
      type: 'text',
      required: true,
      localized: true,
      validate: obbligatorioTesto,
    },
    {
      name: 'date',
      label: 'Data',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'excerpt',
      label: 'Sommario',
      type: 'textarea',
      localized: true,
      admin: {
        description: "Due righe che compaiono nell'elenco news e nei motori di ricerca",
      },
    },
    {
      name: 'cover',
      label: 'Immagine o locandina',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'attachments',
      label: 'Allegati',
      type: 'array',
      labels: { singular: 'Allegato', plural: 'Allegati' },
      fields: [
        {
          name: 'label',
          label: 'Nome del file',
          type: 'text',
          required: true,
          localized: true,
          validate: obbligatorioTesto,
        },
        {
          // Come nei Documenti: di solito esiste una versione del file per lingua; se manca vale quella della lingua predefinita.
          name: 'file',
          label: 'File',
          type: 'upload',
          relationTo: 'media',
          required: true,
          localized: true,
          validate: obbligatorioFile,
        },
      ],
    },
    {
      name: 'activity',
      label: 'Attività collegata',
      type: 'relationship',
      relationTo: 'activities',
      admin: {
        description: "Facoltativo: la news comparirà anche nella pagina di quell'attività",
      },
    },
    {
      name: 'body',
      label: 'Testo',
      type: 'richText',
      required: true,
      localized: true,
      validate: obbligatorioTestoFormattato,
    },
    // La data nel formato della base: 2026-05-20-titolo-della-news.
    slugField({ conData: true }),
  ],
}
