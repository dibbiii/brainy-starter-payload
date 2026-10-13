# Confronto Sveltia CMS e Payload CMS

Registro delle differenze incontrate costruendo la stessa base con i due strumenti. Si
aggiorna man mano. Ogni voce dice se è stata **verificata** (provata su un'istanza reale
o letta nel codice) o **da verificare**.

Stato al 13 ottobre 2026. La base Sveltia è quella al tag `sveltia-final` del repository
`brainy-starter`; questa variante parte dal tag `base-sveltia`.

## 1. Architettura e gestione

| Aspetto | Sveltia | Payload |
|---|---|---|
| Cosa si installa | Un pacchetto npm statico, copiato nel sito | Un'applicazione Next.js, un database PostgreSQL e una cartella per i file caricati |
| Dove stanno i contenuti | File Markdown/JSON nel repository Git | Nel database (testi) e in una cartella (media) |
| Come si pubblica una modifica | Il salvataggio è un commit: il deploy parte da solo | Il sito è statico e va rigenerato: ora con un comando manuale, in futuro con un webhook |
| Server necessari online | Nessuno per il pannello (usa GitHub) | Server Node + PostgreSQL + volume persistente per i media |
| Utenti e permessi | Quelli del repository Git (**da verificare**) | Propri: ruoli `admin` ed `editor`, salvati nel database |
| Backup | Il repository è il backup | Da fare: database e cartella dei media (previsto nel piano) |

## 2. Differenze di modello trovate

- **Testo alternativo delle immagini.** Sveltia: un campo accanto a ogni immagine
  (`cover_alt`, `image_alt`…). Payload: nel file Media, scritto una volta e tradotto per
  lingua. Scelta voluta; nei blocchi spariscono i campi `*_alt`. Verificato.
- **Slug.** Sveltia: il nome del file. Payload: un campo separato dall'id del database,
  ricavato dal titolo, univoco, modificabile solo dall'amministratore dopo la creazione
  (con un hook e un controllo di accesso sul campo). Verificato.
- **Bozze.** Sveltia: un campo `draft` da spuntare a mano (solo per le news). Payload: bozze
  e versioni native, con storico; gli anonimi non vedono le bozze neanche dall'API. Verificato.
- **Riassunto nell'elenco dei blocchi.** Sveltia: `summary` mostra il titolo di ogni
  blocco. Payload: servirebbe un componente personalizzato; per ora le righe mostrano solo
  il tipo di blocco. Da verificare nel pannello.
- **Selettore di colore.** Sveltia ha il widget `color`. Payload non ha un campo colore
  nativo: la documentazione consiglia un campo di testo con validazione e un componente
  personalizzato. Fatto: `components/ColorField.tsx` (selettore del browser più codice
  esadecimale) e `fields/colore.ts` (validazione `#rrggbb`); il componente va registrato
  nella mappa `importMap.js`, un file generato. Provato nel pannello: si disegna bene e il
  valore si salva. Costo: un componente React e un file generato in più da mantenere.
- **Permessi sulle Impostazioni.** L'aspetto lo modifica solo l'amministratore; dati del
  sito, menu e sponsor anche l'editor. Lettura pubblica per tutte. Verificato.
- **Etichette delle righe.** I campi `array` e `blocks` mostrano «Aggiungi Item» e
  «Aggiungi Section» in inglese finché non si impostano le `labels` (singolare e plurale)
  su ogni campo. Corretto su tutti. Verificato nel pannello.
- **Nomi e ordine dei campi.** Ho mantenuto in Payload gli stessi nomi dei campi della base
  (`button_label`, `show_managers`…) per riusare i componenti Astro. Payload preferirebbe
  `camelCase`.
- **Bozze al posto del campo `draft`.** Le news della base avevano una casella «Bozza»;
  in Payload le bozze sono native per News, Pagine e Attività. Team e impostazioni si salvano
  direttamente, senza bozze. Verificato.
- **Relazioni.** Responsabili delle attività e attività collegata alle news sono relazioni
  native: eliminando una persona o un'attività il collegamento sparisce da solo, come in
  Sveltia. Con `depth=1` l'API restituisce i documenti collegati già popolati, utile per lo
  snapshot del sito. Verificato.
- **Nome e ruolo nell'elenco dei responsabili.** Sveltia mostra «Nome — Ruolo»; Payload mostra
  solo il titolo del documento (il nome). Si può migliorare con un campo calcolato.
  Da verificare nel pannello.
- **Slug delle news.** Stesso formato della base (`2026-05-20-titolo`): la data viene dal
  campo «Data» o, se manca, da quella di oggi. Verificato.
- **Ordinamento.** `defaultSort` ordina Team e Attività per «ordine» e poi per nome, le news
  dalla più recente. Verificato.
- **Email.** In Payload il campo è di tipo `email` (valida il formato); in Sveltia era una
  stringa libera. Verificato.
- **Valori predefiniti per lingua.** Payload accetta una funzione che riceve la lingua:
  i titoli "Ultime news" e "Contatti" si precompilano nella lingua giusta. Verificato.

## 3. Multilingua

Decisioni: italiano (predefinita), inglese e tedesco; struttura dei blocchi comune e solo
i testi tradotti; slug uguale in tutte le lingue; se manca una traduzione si mostra il
testo italiano. La traduzione è **manuale** (nessuna traduzione automatica per ora).

- **Cosa è tradotto.** Titoli, sottotitoli, introduzioni, testi dei pulsanti, didascalie,
  testi delle schede, etichette, numeri e date a testo libero, testo formattato. Comuni
  a tutte le lingue: immagini, link, opzioni (altezza, aspetto, ordine), quantità e il
  campo "Gruppo" del Team (è una chiave di filtro). Eccezione: il file dei Documenti è
  tradotto, perché di solito esiste una versione per lingua.
- **Aggiungere una lingua** richiede di cambiare `packages/content/src/locales.ts` e di
  generare una migrazione: in PostgreSQL le lingue sono un tipo enumerato. Verificato.
- **Obbligatorio e tradotto.** Se un campo è obbligatorio in tutte le lingue, non si può
  salvare una traduzione parziale (con la struttura comune ogni blocco esiste in ogni lingua).
  Soluzione: `fields/obbligatorio.ts` rende l'obbligo valido solo in italiano. Verificato.
- **Traduzioni che invecchiano.** Se si modifica un testo in una lingua, le altre restano
  com'erano e nessuno viene avvisato. Se la traduzione non è mai stata scritta si vede
  l'italiano. Si propagano a tutte le lingue solo la struttura, le immagini, i link e le
  opzioni. Verificato via API; se servirà, si può aggiungere un campo "da rivedere".
- **Bozza e pubblicato valgono per l'intero documento**, non per lingua. Esiste
  `localizeStatus`, ma la documentazione lo dà come sperimentale: non attivato.
- **Salvare una traduzione** richiede di rimandare tutta la struttura (come fa il pannello):
  una richiesta con soli testi cancellerebbe immagini e link. Vale per seed e script.
- **Traduzione automatica.** Sveltia: la documentazione dice che si possono attivare
  traduzioni con IA nelle impostazioni (servizi e chiavi **da verificare**). Payload: nessun
  plugin ufficiale; servirebbe un plugin della comunità o codice nostro.
- **Lingua inesistente.** L'API Payload ignora un codice di lingua sconosciuto e risponde
  nella lingua predefinita, anche con `fallback-locale=none`: lo script di aggiornamento del
  sito deve validare i codici. Verificato.

## 4. Cose incontrate durante la costruzione

- **Il template ufficiale su `main` è codice in sviluppo**: per le versioni rilasciate va
  preso dal tag (qui `v3.90.2`). Verificato.
- **Versioni di Next.js.** Payload dichiara quali sono compatibili e l'elenco cambia tra
  una versione e l'altra (oggi `>=16.3.3 <17`, oltre alle righe 15.x indicate).
  Verificato.
- **Monorepo.** Il template imposta `turbopack.root` sulla cartella dell'app; con i
  workspace npm `next` sta nella cartella principale e il pannello dà errore 500. Si imposta
  la radice del repository. Verificato.
- **Next.js genera un file `AGENTS.md`** ad ogni avvio; si disattiva con `agentRules: false`.
- **TypeScript 7 e GraphQL 17** esistono ma non sono compatibili con `@astrojs/check` e con
  Payload: restiamo su TypeScript 6 e GraphQL 16. Verificato.
- **PostgreSQL 18** richiede il volume in `/var/lib/postgresql` (non più in `.../data`).
  Verificato.
- **Dev server.** Una modifica a un file di configurazione annidato (non `payload.config.ts`)
  non viene ricaricata: serve riavviare il CMS. Verificato.
- **Blocchi sconosciuti.** Payload li scarta in silenzio (risposta 201 senza errori). Verificato.
- **Immagini SVG.** `image/*` ammette anche gli SVG (la base ne usa): vanno bene finché a
  caricare sono utenti fidati, perché possono contenere script.
- **Windows.** Su Git Bash i percorsi Linux nei comandi Docker vengono convertiti in percorsi
  Windows (serve `MSYS_NO_PATHCONV=1`); i file della base hanno fine riga CRLF.

## 5. Il pannello in uso (provato nel browser il 13 ottobre 2026)

- **Cambio lingua.** Il selettore «Locale» è in alto a destra (Italiano, English, Deutsch).
  Cambiando lingua il modulo mostra i testi di quella lingua: i campi tradotti hanno il
  suffisso «— English» e, se non tradotti, sono **vuoti**; non c'è il testo italiano da
  guardare nella stessa schermata, quindi chi traduce passa avanti e indietro. I campi comuni
  (immagini, link, opzioni) restano uguali e non vanno rifatti.
- **Titolo vuoto.** Se il titolo non è tradotto, l'intestazione della pagina mostra l'id
  del documento («1») al posto del titolo.
- **Righe dei blocchi.** Ogni sezione si presenta come «01 Copertina — Senza titolo»: manca
  il riassunto che Sveltia mostra (il titolo della sezione). Confermato.
- **Righe fuori schermo.** Le righe di un array lontane dalla parte visibile (es. «Numeri»)
  vengono disegnate solo quando ci si avvicina scorrendo: all'inizio appaiono vuote. Non è un
  difetto della nostra configurazione. Verificato.
- **Lingua dell'interfaccia.** Quasi tutto è in italiano (menu, pulsanti, «Salva Bozza»,
  «Pubblica modifiche», «Versioni»). Eccezione vista: la voce «Log out» del menu.
- **Menu laterale.** Raggruppato come da configurazione: Contenuti, Impostazioni,
  Amministrazione.

## 6. Ancora da misurare

- Tempo di setup di un nuovo cliente con i due strumenti.
- Esperienza d'uso del pannello da parte di un editor non tecnico (qui provato solo da noi).
  Ancora da guardare: caricamento dei file dal pannello, blocchi di tipo testo con link,
  bozze e pubblicazione.
- Costi e complessità di hosting di Payload (server, database, backup), rinviati.
- Aggiornamento del sito dopo una modifica: comando manuale oggi, webhook in seguito.
