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
- [ ] Segnali (Ctrl+C) e blocco orfano riconosciuto (PID)
- [ ] Stato di `meta.json` letto all'avvio e controllato da `verifica:equivalenza`
- [ ] Test delle fasi di `aggiorna()` con percorsi iniettati
- [ ] HTML: solo convertitori ammessi, errore sui nodi sconosciuti (via il controllo sul testo)
- [ ] Lettura per `id`, corpo dentro i tentativi, avvisi anche in errore, `CMS_URL` validato, nomi media severi, `yaml` nel sito
- [ ] Lingue in `verifica-equivalenza.ts` prese da `@brainy/content`
- [ ] Lettura delle email del Team con un utente in sola lettura (decisione 16/10)
- [ ] Snapshot e media versionati nel repository (decisione 16/10: togliere da `.gitignore` al momento del collegamento del sito)

## Fase 3 · CMS [V]
- [ ] Slug libero (`beforeDuplicate` + suffisso) e Duplica su Team
- [ ] Validatori composti con quelli di `payload/shared`
- [ ] Titolo obbligatorio in italiano anche creando/pubblicando in un'altra lingua
- [ ] Prova NOT NULL nel pannello (Team, Menu, Dati del sito) ed eventuale correzione
- [ ] `access.unlock` solo admin, ultimo admin protetto, `first-register` bloccato in produzione + comando per il primo admin
- [ ] URL validati nel CMS e nello schema dello snapshot
- [ ] Media: estensione coerente con il tipo, `resizeOptions` (via i metadati GPS, da provare con una foto)
- [ ] Email del Team leggibili solo con account
- [ ] Correggere il commento su `saveToJWT` in `Users.ts`

## Fase 4 · Seed [V]
- [ ] Transazioni per elemento
- [ ] Media riconosciuti anche con il suffisso (`-1`)
- [ ] Errori di sintassi dei file segnalati; `null` trattato come assente
- [ ] Editor del progetto per Markdown -> Lexical
- [ ] `SEED_FORZA=1` al posto di `--forza`
- [ ] Email nude convertite senza toccare i link esistenti

## Fase 5 · `init` e Docker [V]
- [ ] Nomi PostgreSQL (accenti, `pg_`, 63 caratteri), porte anche su IPv6, `.env` con `wx` e `0600`, messaggio sul volume
- [ ] Compose: ICU `it-IT`, healthcheck con `-h 127.0.0.1`
- [ ] `env.ts`/`next.mjs`: solo ENOENT ignorato, `NODE_OPTIONS` aggiunto, sviluppo su 127.0.0.1

## Fase 6 · Produzione e migrazioni [V]
- [ ] `migrationDir`, migrazione iniziale da DB mai toccato dal push, comandi `db:migrate*` e `ci`
- [ ] `serverURL`, `csrf`, cookie `secure`, intestazioni Next, `poweredByHeader: false`
- [ ] GraphQL disattivato (e rotte tolte), `maxDepth`, limite dimensione file, email facoltativa
- [ ] Documentare rate limiting e creazione del primo admin

## Fase 7 · Sito sullo snapshot [V]
- [ ] Loader per collezione con controllo di `meta.json`, `rendered.html` per le news, schema da `@brainy/content`
- [ ] Via `md()`/`marked` dal sito; URL del sito dallo snapshot; via i vecchi file di contenuto e `public/uploads`
- [ ] Link e immagini dell'HTML generato da `html.ts` passati da `urlSicuro` (in Astro 7 i plugin rehype richiedono `@astrojs/markdown-satteri`: meglio farlo nel convertitore)
- [ ] Confronto pagina per pagina con la base

## Fase 8 · Multilingua e testi alternativi [V]
- [ ] `i18n` con italiano senza prefisso, dizionario, link prefissati, `lang`/`hreflang`, sitemap `i18n`, date UTC
- [ ] Usare i nuovi `*_alt` e `og:image:alt`

## Fase 9 · Backup, ripristino e comandi [V]
- [ ] `pg_dump`/`pg_restore` + cartella media, ripristino provato su ambiente vuoto
- [ ] Comandi radice: `build`, `check`, `test` di entrambe le app
- [ ] Prova completa da clone nuovo seguendo solo il README

## Fase 10 · Documentazione
- [ ] README per Payload, guide `docs/` riscritte
- [ ] `docs/confronto.md` corretto (affermazioni sbagliate, "verificato" solo con prova riproducibile)
- [ ] In `docs/aggiungere-un-blocco.md` (anche nella base): con la CSP niente `style=""`, script inline solo tramite Astro, iframe solo da YouTube
- [ ] Accorciare i commenti troppo lunghi scritti finora
- [ ] Cancellare questo file

## Promemoria
- La base Sveltia ha lo stesso `core.autocrlf=true`: rinormalizzarla prima di applicare le patch.
- Nella base `md()` usa `marked` su contenuti degli editor senza sanificare: lì gli editor hanno accesso al repository, rischio accettato.
