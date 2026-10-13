import type { BlocksField, BlockSlug } from 'payload'

import { sectionBlocks } from '../blocks'

// L'elenco dei blocchi è definito una volta sola (nel campo `blocks` della configurazione principale) e qui lo si richiama per nome: Pagine e Attività usano lo stesso campo.
// La struttura è comune a tutte le lingue; i testi dentro ai blocchi sono tradotti.
export const sectionsField: BlocksField = {
  name: 'sections',
  label: 'Sezioni',
  type: 'blocks',
  // I nomi sono quelli dei blocchi qui sopra; il tipo preciso (BlockSlug) lo genera Payload.
  blockReferences: sectionBlocks.map((block) => block.slug as BlockSlug),
  blocks: [],
  admin: { description: 'Componi la pagina aggiungendo e riordinando le sezioni' },
}
