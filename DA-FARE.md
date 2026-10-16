# Da fare (file di lavoro: si cancella alla fine delle correzioni)

Legenda: [P] da riportare anche nella base Sveltia (e poi in Cauriol), [V] solo variante Payload.

## Fase 0 · Igiene del repository
- [x] [P] Fine riga: `core.autocrlf=false` e copia di lavoro rinormalizzata (0 file CRLF)
- [x] [V] `engines` (Node >= 22.12) e `.nvmrc`

## Fase 1 · Correzioni del sito portabili [P]
- [x] Indirizzo senza `set:html` (Footer, Contatti)
- [x] Link sicuri: `urlSicuro()` in tutti gli `href` che arrivano dai contenuti
- [x] Colori del tema validati prima di entrare nel CSS
- [x] Sottomenu apribili da tastiera (modello WAI disclosure)
- [x] Un solo `h1` per pagina (home e pagine interne)
- [x] Galleria: link con nome accessibile anche senza didascalia
- [x] Avviso in build se il contrasto dei colori del tema è insufficiente
- [x] Intestazioni di sicurezza: CSP nel `<meta>`, `public/_headers`, guida per gli altri hosting
- [x] Riportare nella base Sveltia (branch `correzioni-sito`, senza push): patch `--relative=apps/site` + `.gitattributes` + `pattern` sui campi URL di `config.yml` + a mano `docs/intestazioni-di-sicurezza.md` e il paragrafo del README (percorso `public/_headers`)
- [x] Riportare in Cauriol (branch `correzioni-sito`, merge della base, decorazioni senza `style=""`, build e prova nel browser)
- [ ] Quando l'utente lo chiede: unire `correzioni-sito` in `main` e pubblicare, nella base e in Cauriol

## Fase 2 · Snapshot: rifinitura [V]
- [x] Segnali (Ctrl+C) e blocco orfano riconosciuto (PID) — Ctrl+C provato solo nel codice: su Windows non si può simulare da script
- [x] Stato di `meta.json` letto all'avvio e controllato da `verifica:equivalenza`
- [x] Test delle fasi di `aggiorna()` con percorsi iniettati
- [x] HTML: solo convertitori ammessi, errore sui nodi sconosciuti (via il controllo sul testo)
- [x] Lettura per `id`, corpo dentro i tentativi, avvisi anche in errore, `CMS_URL` validato, nomi media severi, `yaml` nel sito
- [x] Lingue in `verifica-equivalenza.ts` prese da `@brainy/content`
- [x] Lettura delle email del Team con una chiave di lettura (collezione `chiavi-api`, `npm run chiave:snapshot`, `CMS_API_KEY`)

## Fase 3 · CMS [V]
- [x] Duplica: slug `-copia`, `-copia-2`… (provato su Team e Pagine)
- [x] Validatori composti con quelli di `payload/shared`; link del testo formattato controllati (Lexical non lo fa sul server)
- [x] Creare solo in italiano; pubblicare/salvare da un'altra lingua solo con la versione italiana completa (hooks/versioneItaliana.ts)
- [x] NOT NULL confermato (traduzione di un elemento creato solo in italiano): ora una traduzione vuota si salva ""
- [x] `access.unlock` solo admin, ultimo admin protetto, primo utente in produzione solo con `npm run admin:crea`
- [x] Link validati nel CMS e nello schema (regola in `packages/content/src/link.ts`); indirizzo del sito completo
- [x] Media: solo estensioni dell'elenco, tipi espliciti, `resizeOptions` (provato: foto raddrizzata, EXIF e GPS tolti)
- [x] Email del Team leggibili solo con account (fatto nella Fase 2)
- [x] Titoli dell'editor senza h1 (`HeadingFeature` h2–h4, provato nel pannello)
- [x] Corretto il commento su `saveToJWT` (Payload rilegge l'utente a ogni richiesta)
- [ ] Documentare `npm run admin:crea` (Fase 11) e l'uso in hosting: la password stampata finisce nei log se il comando gira come job della piattaforma
- [ ] Da documentare: un'immagine caricata con un tipo dichiarato falso (es. JPEG come `.pdf`) non passa da sharp e tiene i metadati

## Fase 4 · Seed [V]
- [x] Transazioni per elemento (provato: una traduzione non valida non lascia l'elemento a metà)
- [x] Media riconosciuti anche con il suffisso (`-1`); dopo un database azzerato si sovrascrive il file invece di creare `-1`
- [x] Errori di sintassi dei file segnalati (JSON e YAML); `null` trattato come assente
- [x] Editor del progetto per Markdown -> Lexical (snapshot ancora uguale alla base)
- [x] `SEED_FORZA=1` al posto di `--forza`
- [x] Email nude convertite senza toccare link, autolink e codice

## Fase 5 · `init` e Docker [V]
- [x] Nomi PostgreSQL (accenti, `pg_`, cifra iniziale, 63 caratteri), porte anche su IPv6, `.env` con `wx` e `0600`, avviso sul volume esistente
- [x] `init`: riga `CMS_API_KEY=` vuota nel `.env` generato (la riempie `chiave:snapshot`)
- [x] Compose: ICU `it-IT` (provato l'ordinamento), healthcheck con `-h 127.0.0.1`
- [x] `env.ts`/`next.mjs`: solo ENOENT ignorato, `NODE_OPTIONS` aggiunto, sviluppo su 127.0.0.1 (provati snapshot, curl e browser con `localhost`)

## Fase 6 · Produzione e migrazioni [V]
- [ ] `migrationDir`, migrazione iniziale da DB mai toccato dal push, comandi `db:migrate*` e `ci`
- [ ] `serverURL`, `csrf`, cookie `secure`, intestazioni Next, `poweredByHeader: false`
- [ ] GraphQL disattivato (e rotte tolte), `maxDepth`, limite dimensione file, email facoltativa
- [ ] Documentare rate limiting e creazione del primo admin

## Fase 7 · Sito sullo snapshot [V]
- [ ] Loader per collezione con controllo di `meta.json`, `rendered.html` per le news, schema da `@brainy/content`
- [ ] Via `md()`/`marked` dal sito; URL del sito dallo snapshot; via i vecchi file di contenuto e `public/uploads`
- [x] Link dell'HTML generato da `html.ts` passati da `urlSicuro` (fatto nella Fase 2; immagini nel testo escluse dall'editor)
- [ ] Snapshot e media versionati nel repository (decisione 16/10: togliere da `.gitignore` al momento del collegamento del sito)
- [ ] Confronto pagina per pagina con la base

## Fase 8 · Multilingua e testi alternativi [V]
- [ ] `i18n` con italiano senza prefisso, dizionario, link prefissati, `lang`/`hreflang`, sitemap `i18n`, date UTC
- [ ] Usare i nuovi `*_alt` e `og:image:alt`

## Fase 9 · Backup, ripristino e comandi [V]
- [ ] `pg_dump`/`pg_restore` + cartella media, ripristino provato su ambiente vuoto
- [ ] Comandi radice: `build`, `check`, `test` di entrambe le app
- [ ] Prova completa da clone nuovo seguendo solo il README

## Fase 10 · Codice in inglese (richiesta dell'utente, dopo tutte le altre correzioni)
- [ ] Nomi di file, cartelle, funzioni, variabili, tipi, costanti e comandi npm (es. `contenuti:aggiorna`, `chiave:snapshot`) in inglese; in italiano restano solo i commenti
- [ ] Da chiarire con l'utente prima di iniziare: i testi mostrati alle persone (etichette e messaggi del pannello, messaggi dei comandi, testi del sito) restano in italiano?
- [ ] Da chiarire: vale anche per la base Sveltia e per Cauriol? (porting come nella Fase 1)
- [ ] Dopo la rinomina: test, controllo dei tipi, build, seed e snapshot di prova, verifica con subagente

## Fase 11 · Documentazione (dopo la rinomina, così usa i nomi nuovi)
- [ ] README per Payload, guide `docs/` riscritte
- [ ] Documentare `CMS_API_KEY` e `npm run chiave:snapshot` (anche in hosting: variabile della piattaforma)
- [ ] `docs/confronto.md` corretto (affermazioni sbagliate, "verificato" solo con prova riproducibile)
- [ ] In `docs/aggiungere-un-blocco.md` (anche nella base): con la CSP niente `style=""`, script inline solo tramite Astro, iframe solo da YouTube
- [ ] Accorciare i commenti troppo lunghi scritti finora
- [ ] Cancellare questo file

## Promemoria
- Negli hook, una lettura con l'API locale e `req` cambia `req.locale`: usare `stessaLingua()` (hooks/stessaLingua.ts).
- La base Sveltia ha lo stesso `core.autocrlf=true`: rinormalizzarla prima di applicare le patch.
- Nella base `md()` usa `marked` su contenuti degli editor senza sanificare: lì gli editor hanno accesso al repository, rischio accettato.
