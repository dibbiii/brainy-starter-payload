import type { Block } from 'payload'

import { Activities } from './activities'
import { Cards } from './cards'
import { Contacts } from './contacts'
import { Cta } from './cta'
import { Documents } from './documents'
import { Gallery } from './gallery'
import { Hero } from './hero'
import { LatestNews } from './latestNews'
import { Sponsors } from './sponsors'
import { Stats } from './stats'
import { Team } from './team'
import { Text } from './text'
import { TextImage } from './textImage'
import { Timeline } from './timeline'
import { Video } from './video'

/**
 * I 15 blocchi con cui si compongono pagine e attività, nello stesso ordine della base.
 * Per aggiungerne uno: crea il file qui accanto e inseriscilo in questo elenco.
 */
export const sectionBlocks: Block[] = [
  Hero,
  Text,
  TextImage,
  Cards,
  Activities,
  Team,
  Sponsors,
  Gallery,
  Cta,
  Stats,
  Timeline,
  Documents,
  LatestNews,
  Video,
  Contacts,
]
