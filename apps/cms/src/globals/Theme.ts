import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '../access'
import { campoColore } from '../fields/colore'

// L'aspetto del sito (colori, caratteri, angoli) lo modifica solo l'amministratore.
export const Theme: GlobalConfig = {
  slug: 'theme',
  label: 'Aspetto',
  admin: { group: 'Impostazioni' },
  access: {
    read: anyone,
    update: isAdmin,
  },
  fields: [
    campoColore('primary', 'Colore principale'),
    campoColore('accent', 'Colore accento (segnavia e pulsanti)'),
    campoColore('ink', 'Colore testo'),
    campoColore('paper', 'Colore sfondo'),
    {
      name: 'heading_font',
      label: 'Carattere titoli',
      type: 'select',
      required: true,
      defaultValue: 'barlow',
      options: [
        { label: 'Barlow Condensed (sportivo)', value: 'barlow' },
        { label: 'Archivo (moderno)', value: 'archivo' },
        { label: 'Fraunces (elegante)', value: 'fraunces' },
        { label: 'Source Serif 4 (editoriale)', value: 'source_serif' },
      ],
    },
    {
      name: 'body_font',
      label: 'Carattere testo',
      type: 'select',
      required: true,
      defaultValue: 'source',
      options: [
        { label: 'Source Sans (neutro)', value: 'source' },
        { label: 'Atkinson Hyperlegible (massima leggibilità)', value: 'atkinson' },
        { label: 'Lora (classico)', value: 'lora' },
      ],
    },
    {
      name: 'corners',
      label: 'Angoli',
      type: 'select',
      required: true,
      defaultValue: 'square',
      options: [
        { label: 'Squadrati', value: 'square' },
        { label: 'Leggermente arrotondati', value: 'soft' },
      ],
    },
  ],
}
