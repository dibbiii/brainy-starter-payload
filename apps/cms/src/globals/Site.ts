import type { GlobalConfig } from 'payload'

import { anyone, isStaff } from '../access'
import { versioneItalianaGlobale } from '../hooks/versioneItaliana'
import { perLingua } from '../blocks/shared'
import { testoObbligatorio } from '../fields/obbligatorio'
import { validaLink } from '../fields/link'

// Testi: il motto, il sottotitolo, le note e le etichette si traducono; contatti, indirizzi,
// link, immagini e opzioni sono comuni a tutte le lingue.
export const Site: GlobalConfig = {
  slug: 'site',
  label: 'Dati del sito',
  admin: { group: 'Impostazioni' },
  hooks: { beforeChange: [versioneItalianaGlobale] },
  access: {
    read: anyone,
    update: isStaff,
  },
  fields: [
    // Il nome della società è un marchio: non si traduce.
    { name: 'name', label: 'Nome', type: 'text', required: true },
    { name: 'tagline', label: 'Motto', type: 'text', localized: true },
    {
      name: 'url',
      label: 'Indirizzo del sito',
      type: 'text',
      required: true,
      // Indirizzo completo: con un percorso come "/" sitemap e anteprime di condivisione sarebbero sbagliate.
      validate: (valore: string | null | undefined) =>
        (typeof valore === 'string' && /^https?:\/\/([^\s/?#]+\.[^\s/?#]+|localhost(:\d+)?)\/?$/.test(valore.trim())) ||
        "Scrivi l'indirizzo completo del sito, es. https://www.esempio.it",
      admin: { description: 'Es. https://www.esempio.it — serve per sitemap e condivisioni' },
    },
    { name: 'logo', label: 'Logo', type: 'upload', relationTo: 'media' },
    {
      name: 'show_name_with_logo',
      label: 'Mostra il nome accanto al logo',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Se spento, con il logo caricato si vede solo il logo' },
    },
    {
      name: 'header_subtitle',
      label: "Sottotitolo nell'intestazione",
      type: 'text',
      localized: true,
      admin: { description: 'Riga piccola sotto il nome. Es. ASD · Ziano di Fiemme' },
    },
    {
      name: 'header_button_label',
      label: 'Pulsante in evidenza — testo',
      type: 'text',
      localized: true,
      admin: { description: 'Es. Tesseramento. Compare solo se compili anche il link' },
    },
    { name: 'header_button_url', label: 'Pulsante in evidenza — link', type: 'text', validate: validaLink },
    {
      name: 'page_header_style',
      label: 'Intestazione delle pagine interne',
      type: 'select',
      defaultValue: 'simple',
      options: [
        { label: 'Semplice (solo il titolo)', value: 'simple' },
        { label: 'Fascia con briciole di pane e descrizione', value: 'band' },
      ],
      admin: {
        description:
          'Vale per tutte le pagine tranne la home. La fascia mostra briciole di pane, titolo, descrizione e, se caricata, un\'immagine.',
      },
    },
    { name: 'og_image', label: 'Immagine per condivisioni social', type: 'upload', relationTo: 'media' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Telefono', type: 'text' },
    { name: 'address', label: 'Indirizzo', type: 'textarea' },
    { name: 'tax_id', label: 'Codice fiscale / P.IVA', type: 'text' },
    {
      name: 'socials',
      label: 'Social',
      type: 'array',
      labels: { singular: 'Social', plural: 'Social' },
      fields: [
        {
          name: 'platform',
          label: 'Piattaforma',
          type: 'select',
          required: true,
          options: ['Facebook', 'Instagram', 'YouTube', 'Strava', 'LinkedIn', 'TikTok', 'Altro'],
        },
        { name: 'url', label: 'Link', type: 'text', validate: validaLink, required: true },
      ],
    },
    {
      name: 'privacy_url',
      label: 'Link informativa privacy',
      type: 'text',
      validate: validaLink,
      required: true,
      defaultValue: '/privacy',
    },
    { name: 'footer_note', label: 'Testo a piè di pagina', type: 'textarea', localized: true },
    {
      name: 'footer_logo',
      label: 'Logo nel piè di pagina',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Versione chiara del logo, perché il fondo è scuro. Se vuoto si vede il nome del sito',
      },
    },
    {
      name: 'footer_columns',
      label: 'Colonne di link nel piè di pagina',
      type: 'array',
      labels: { singular: 'Colonna', plural: 'Colonne' },
      fields: [
        {
          name: 'title',
          label: 'Titolo della colonna',
          type: 'text',
          localized: true,
          ...testoObbligatorio(),
        },
        {
          name: 'from_activities',
          label: "Aggiungi l'elenco delle attività",
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: "Dopo i link scritti a mano, aggiunge in automatico tutte le attività",
          },
        },
        {
          name: 'links',
          label: 'Link',
          type: 'array',
          labels: { singular: 'Link', plural: 'Link' },
          fields: [
            {
              name: 'label',
              label: 'Testo',
              type: 'text',
              localized: true,
              ...testoObbligatorio(),
            },
            { name: 'url', label: 'Link', type: 'text', validate: validaLink, required: true },
          ],
        },
      ],
    },
    // Sezione «Attività»: il nome cambia da cliente a cliente (Discipline, Gare, Corsi...).
    {
      name: 'activities_label',
      label: 'Attività: nome della sezione (plurale)',
      type: 'text',
      localized: true,
      defaultValue: perLingua({ it: 'Attività', en: 'Activities', de: 'Aktivitäten' }),
      admin: {
        description: 'Es. Discipline, Gare, Corsi. Compare nelle briciole di pane e nei titoli',
      },
    },
    {
      name: 'activities_path',
      label: 'Attività: indirizzo della sezione',
      type: 'text',
      defaultValue: 'attivita',
      validate: (valore: string | null | undefined) =>
        !valore || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valore) || 'Solo minuscole, numeri e trattini.',
      admin: {
        description: 'Es. discipline → le pagine saranno /discipline/nome. Solo minuscole e trattini',
      },
    },
    {
      name: 'activities_more_title',
      label: 'Attività: titolo «Altre…»',
      type: 'text',
      localized: true,
      defaultValue: perLingua({
        it: 'Altre attività',
        en: 'Other activities',
        de: 'Weitere Aktivitäten',
      }),
      admin: {
        description: 'Sotto ogni pagina di dettaglio. Es. Altre discipline / Altri corsi',
      },
    },
    {
      name: 'activities_all_label',
      label: 'Attività: link a tutte',
      type: 'text',
      localized: true,
      defaultValue: perLingua({
        it: 'Tutte le attività',
        en: 'All activities',
        de: 'Alle Aktivitäten',
      }),
      admin: { description: 'Es. Tutte le discipline / Tutti i corsi' },
    },
    {
      name: 'show_section_nav',
      label: 'Mostra le altre pagine della sezione',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'In fondo alle pagine che nel menu stanno dentro un sottomenu (es. La società), mostra le altre pagine di quel sottomenu',
      },
    },
    {
      name: 'show_share_links',
      label: 'Pulsanti di condivisione su news e attività',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Link per condividere su X e Facebook, senza script né cookie. Per le pagine normali si attiva pagina per pagina',
      },
    },
    {
      name: 'news_featured',
      label: 'News: prima news in evidenza',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: "Nell'elenco la news più recente appare grande, in cima" },
    },
    {
      name: 'news_sidebar',
      label: 'News: colonna laterale',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Nella pagina di una news mostra a fianco le altre news' },
    },
    {
      name: 'news_box_title',
      label: 'News: riquadro nella colonna — titolo',
      type: 'text',
      localized: true,
      admin: {
        description: 'Facoltativo, si vede solo con la colonna laterale. Es. Tesseramento',
      },
    },
    {
      name: 'news_box_text',
      label: 'News: riquadro nella colonna — testo',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'news_box_button_label',
      label: 'News: riquadro nella colonna — testo pulsante',
      type: 'text',
      localized: true,
    },
    {
      name: 'news_box_button_url',
      label: 'News: riquadro nella colonna — link pulsante',
      type: 'text',
      validate: validaLink,
    },
  ],
}
