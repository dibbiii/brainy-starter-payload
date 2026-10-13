'use client'

import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

// Payload non ha un campo colore: questo componente sostituisce il campo di testo con il
// selettore di colore del browser più la casella del codice (#rrggbb). Il valore salvato
// è sempre il testo esadecimale; la validazione sta nel campo (fields/colore.ts).
export const ColorField: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError } = useField<string>({ path })

  // Il selettore accetta solo #rrggbb: con un valore incompleto mostra il nero senza toccare il testo.
  const valido = /^#[0-9a-fA-F]{6}$/.test(value ?? '')

  return (
    <div className="field-type text">
      <FieldLabel label={field.label} path={path} required={field.required} />
      <div style={{ alignItems: 'center', display: 'flex', gap: '0.75rem' }}>
        <input
          aria-label="Selettore di colore"
          disabled={readOnly}
          onChange={(evento) => setValue(evento.target.value)}
          style={{ blockSize: '2.5rem', cursor: 'pointer', inlineSize: '3.5rem', padding: 0 }}
          type="color"
          value={valido ? (value as string) : '#000000'}
        />
        <input
          aria-label="Codice del colore"
          disabled={readOnly}
          maxLength={7}
          onChange={(evento) => setValue(evento.target.value)}
          placeholder="#24493d"
          style={{ fontFamily: 'monospace', inlineSize: '9rem' }}
          type="text"
          value={value ?? ''}
        />
      </div>
      <FieldError path={path} showError={showError} />
      <FieldDescription description={field.admin?.description} path={path} />
    </div>
  )
}
