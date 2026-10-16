import type { TextareaField, TextField } from 'payload'

import { testoObbligatorio } from '../fields/obbligatorio'

// Campi che si ripetono in molti blocchi. Il testo si traduce (localized) - la struttura dei blocchi è comune, i testi no.

/** Titolo del blocco. Se obbligatorio, lo è nella sola lingua predefinita. */
export const title = (required = false): TextField => ({
  name: 'title',
  label: 'Titolo',
  type: 'text',
  localized: true,
  ...(required ? testoObbligatorio() : {}),
})

export const intro = (): TextareaField => ({
  name: 'intro',
  label: 'Introduzione',
  type: 'textarea',
  localized: true,
})

/** Valore predefinito diverso per ogni lingua (per i titoli che hanno un testo standard). */
export const perLingua =
  (testi: Record<string, string>) =>
  ({ locale }: { locale?: string }) =>
    testi[locale ?? 'it'] ?? testi.it
