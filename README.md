# Brainy Starter — Astro + Sveltia CMS

Base riutilizzabile per siti statici di associazioni, eventi e piccole aziende.
Il cliente aggiorna news, pagine, team e sponsor da `/admin`; ogni modifica
diventa un commit su Git e il sito si ricostruisce da solo.

## Avvio in locale

```bash
npm install          # installa le dipendenze
npm run dev          # → http://localhost:4321
```

Il pannello **non ha un server a parte**. Con `npm run dev` acceso si apre
`http://localhost:4321/admin/index.html` (in sviluppo serve l'indirizzo completo, con
`index.html`; online basta `/admin/`) in **Chrome o Edge** (Firefox e Safari non funzionano
in questa modalità), si clicca **Lavora con Repository Locale** e si sceglie la cartella del
progetto (quella che contiene `.git`). Da lì le modifiche vengono scritte direttamente nei
file, senza password. Il pannello **non fa commit**: si controllano con `git diff` e si
committano a mano. Dopo un `git pull` o una modifica a `config.yml` si ricarica la pagina.

Si può lasciare `npm run dev` acceso mentre si salva: il sito si aggiorna da solo. Dopo ogni
sessione conviene controllare:

```bash
git status     # nessun file vuoto e nessun file .sveltia-tmp-*
git diff       # controlla cosa è cambiato
```

Se un file risulta vuoto o c'è un `.sveltia-tmp-*`: `git restore percorso/del/file` e si
riprova. Un file vuoto non arriva online: la build si ferma e indica quale. Il problema non
esiste per gli editor online, perché con GitHub ogni salvataggio è un commit scritto in un
solo colpo.

**Perché la pagina del pannello è un file statico.** `public/admin/index.html` non passa da
Astro, per scelta. Una pagina dentro `src/pages/` verrebbe **ricaricata dal server di
sviluppo a ogni modifica dei file** (cambio di Impostazioni, nuovo contenuto), interrompendo
il pannello mentre sta ancora scrivendo: in prova ha lasciato un file vuoto e
un'eliminazione a metà (un file `.sveltia-tmp-…`). Lo sconsiglia anche la documentazione di
Sveltia (sezione Troubleshooting del lavoro in locale). **Non spostare il pannello in
`src/pages/`.** Con la pagina statica, nella nostra prova, lo stesso insieme di operazioni
(serie di salvataggi, Impostazioni, creazione ed eliminazione a cascata) è andato senza
problemi; è una prova su una sessione, non una garanzia.

Sveltia viene copiato da `node_modules` in `public/admin/vendor/` (cartella non
versionata) dallo script `scripts/copy-sveltia.mjs`. Parte da solo dopo `npm install`
(`postinstall`); se la cartella manca o dopo un aggiornamento: `npm run admin:copia`.

## Come è organizzato

```
public/admin/config.yml     ← definizione del pannello (campi, blocchi)
public/admin/index.html     ← pagina del pannello (statica: non spostarla in src/pages)
public/admin/vendor/        ← Sveltia copiato da npm (generato, non in Git)
src/content.config.ts       ← schema dei contenuti (il "gemello" di config.yml)
src/content/news/*.md       ← una news per file
src/content/pages/*.md      ← una pagina per file, composta da blocchi
src/content/team/*.md       ← una persona per file (il nome del file è il suo id)
src/content/activities/*.md ← una attività (disciplina, gara, corso) per file
src/data/*.json             ← impostazioni: dati sito, aspetto, menu, sponsor
src/components/blocks/      ← un componente per ogni tipo di blocco
src/layouts/Base.astro      ← <head>, SEO, header, footer
public/uploads/             ← immagini e file caricati dal pannello
```

La regola d'oro: **config.yml e content.config.ts devono descrivere gli stessi
campi.** Se ne cambi uno, cambia l'altro. Se non coincidono, la build si ferma
e l'errore indica il campo.

**Nomi dei file e indirizzi:** il pannello li crea senza accenti né simboli («Perché è così»
→ `perche-e-cosi`; il testo dentro il file resta com'è) e dopo la creazione l'indirizzo non
si cambia più. Nei file salva solo i campi compilati.

## Blocchi disponibili

Ogni pagina è una lista di sezioni che l'editor aggiunge e riordina:
copertina, testo, testo con immagine, schede (gare, corsi, discipline),
elenco delle attività, team, sponsor, galleria, invito all'azione, numeri, periodo
(linea del tempo), documenti, ultime news, video YouTube (con consenso), contatti.

Molte funzioni sono **facoltative e spente di base** (fascia con briciole di pane, news
in evidenza, colonna laterale, condivisione, colonne nel footer…): l'elenco completo, con
dove si attivano, è in [`docs/funzioni-facoltative.md`](docs/funzioni-facoltative.md).

### Aggiungere un nuovo blocco

1. `public/admin/config.yml` → aggiungi un elemento sotto `sections.types`
2. `src/content.config.ts` → crea lo schema con `type: z.literal('nome')` e
   aggiungilo a `discriminatedUnion`
3. `src/components/blocks/Nome.astro` → il componente
4. `src/components/Blocks.astro` → registralo nella mappa

Guida dettagliata, con un esempio completo e i controlli da fare:
[`docs/aggiungere-un-blocco.md`](docs/aggiungere-un-blocco.md).

Se il blocco può servire ad altri clienti, aggiungilo **qui nella base**.

## Il testo scritto nel pannello (Markdown)

L'editor di testo del pannello salva bene titoli, elenchi, citazioni, immagini, link, grassetto e
corsivo. **Due costrutti vengono riscritti in modo diverso quando una voce che li contiene è
modificata e salvata** (verificato riproducendo il salvataggio di 120 voci di un sito reale):

- le **linee orizzontali** (`---`, `* * *`) diventano un elenco con asterischi letterali;
- un **titolo dentro una citazione** (`> ### Titolo`) perde il titolo e mostra i simboli `###`.

Per questo i contenuti scritti a mano o importati vanno senza questi due costrutti: per separare le
sezioni si usano i titoli. Sveltia non elenca tra la sintassi supportata nemmeno le tabelle (e non
è stato provato cosa succede con l'HTML scritto nel testo): meglio evitarli.

Altre riscritture sono invece innocue, e compaiono al primo salvataggio: `*corsivo*` diventa
`_corsivo_`, `***x***` diventa `**_x_**`, `**[testo](url)**` diventa `[**testo**](url)`. Il testo si
vede identico. Un campo viene riscritto **solo se lo si modifica**: cambiare soltanto il titolo di
una news non tocca il suo testo.

## Personalizzare un cliente: `src/brand/`

Colori, caratteri e testi si cambiano dal pannello. Per le cose che il pannello non
copre (un'illustrazione dietro l'intestazione o sopra il footer, stili particolari) c'è la
cartella `src/brand/`: nella base è vuota, nel repository del cliente si riempie. Tenere
le personalizzazioni lì (e in `src/content/`, `src/data/`, `public/uploads/`) evita
conflitti quando si porta un miglioramento della base nel sito del cliente.
Vedi `src/brand/README.md`.

## Attività (discipline, gare, corsi)

Ogni attività è un file: nome, immagine, descrizione, **responsabili** (scelti
dal Team) e una pagina composta a blocchi. Il sito genera da solo:

- la **pagina di dettaglio** (`/attivita/nome`, con intestazione, responsabili,
  sezioni, le **news collegate** e "Altre attività")
- la **griglia** nella pagina elenco, con il blocco *Elenco delle attività*

Per un cliente si adatta così:

1. In `public/admin/config.yml` cambia `label` della collezione `activities`
   (es. "Discipline", "Gare", "Corsi")
2. In *Impostazioni → Dati del sito* imposta nome, indirizzo (`discipline` →
   `/discipline/biathlon`) e i due testi "Altre…" / "Tutte…" (il genere cambia:
   "Altre discipline", "Altri corsi")
3. Crea una pagina con lo **stesso indirizzo** dell'impostazione (es. slug
   `discipline`) e inserisci il blocco *Elenco delle attività*: è la pagina elenco
4. Aggiungi la voce al menu

I responsabili si scelgono dal Team. Il collegamento usa il nome del *file* della
persona: se ne cambi il nome continua a funzionare. Se elimini una persona dal pannello,
Sveltia la toglie da solo dai responsabili (con una conferma). Se invece il file viene
cancellato a mano, sparisce dai responsabili con un avviso nel registro della build, senza
fermarla.
Una news si collega a un'attività dal campo *Attività collegata*.

Guida per chi sviluppa: [`docs/aggiungere-una-collezione.md`](docs/aggiungere-una-collezione.md).

## Nuovo cliente: checklist

1. **Clona la base** (non usare "Use this template": il nuovo sito
   perderebbe il collegamento con la base e non potresti più portargli
   i miglioramenti). Prima crea su GitHub il repository **vuoto**
   `brainylabs/nome-cliente`, poi:
   ```bash
   git clone https://github.com/brainylabs/brainy-starter.git nome-cliente
   cd nome-cliente
   git remote rename origin base        # la base resta collegata come "base"
   git remote add origin https://github.com/brainylabs/nome-cliente.git
   git push -u origin main
   ```
2. `public/admin/config.yml` → `backend.repo: brainylabs/nome-cliente`
3. `npm install && npm run dev`, poi apri `/admin/index.html` (vedi «Avvio in locale»)
4. Dal pannello, **Impostazioni**:
   - *Dati del sito*: nome, URL, contatti, social
   - *Aspetto*: colori, caratteri, angoli
   - *Menu*, *Sponsor*
5. Dal pannello, **Team**: inserisci le persone (una per scheda)
6. Dal pannello, **Pagine**: componi home e pagine interne
7. Cancella le news, le persone, le attività (e la pagina `attivita`) e le immagini di esempio in `public/uploads/`
8. Scrivi l'informativa privacy reale (pagina `privacy`)
9. La favicon (`src/pages/favicon.svg.ts`) usa già i colori scelti in *Aspetto*; modifica quel file solo se il cliente vuole un disegno diverso
10. Deploy (vedi sotto) e crea gli account degli editor

Se un cliente vuole un layout molto diverso, si modificano i componenti nel
suo repository; il pannello e i contenuti restano gli stessi.

## Deploy

Il sito è HTML statico (`npm run build` → cartella `dist/`), quindi può
andare su qualunque hosting. Il punto delicato è **il login al pannello**.

### Netlify (più semplice)

1. Collega il repository: build `npm run build`, cartella `dist`
   (già impostati in `netlify.toml`)
2. Su GitHub crea una **OAuth App** (Settings → Developer settings →
   OAuth Apps) con callback `https://api.netlify.com/auth/done`
3. Su Netlify inserisci Client ID e Secret nella sezione OAuth/accesso del sito
4. Ogni editor accede con il proprio account GitHub, che deve avere
   accesso in scrittura al repository

Netlify Identity e Git Gateway non sono supportati da Sveltia (e Netlify li sta
dismettendo): non usarli.

**Il pulsante «Accedi con GitHub» funziona solo sul sito pubblicato.** Usa il servizio di
Netlify, che accetta soltanto siti registrati: su `localhost` non può funzionare. Per
provare l'accesso online senza OAuth c'è **«Accedi con Token di Accesso»**: un token
*fine-grained* di GitHub limitato al repository, con permesso *Contents: Read and write*,
incollato nel pannello (mai in un file né in chat). Va usato su un **repository di prova**:
ogni salvataggio è un commit. Per i clienti in produzione si può togliere questa possibilità
con `auth_methods: [oauth]` sotto `backend` in `config.yml`.

### Altri hosting (Cloudflare Pages, hosting europeo, server proprio)

Serve un piccolo servizio OAuth intermedio tra il pannello e GitHub. Quello ufficiale di
Sveltia è il **Sveltia CMS Authenticator**, un Cloudflare Worker. Una volta attivo,
aggiungi in `config.yml`:

```yaml
backend:
  name: github
  repo: brainylabs/nome-cliente
  base_url: https://auth.tuodominio.it
```

Un unico proxy può servire tutti i clienti.

### Intestazioni di sicurezza

Su Netlify e Cloudflare Pages sono già impostate in `apps/site/public/_headers`; su altri
hosting vanno configurate a mano: vedi [docs/intestazioni-di-sicurezza.md](docs/intestazioni-di-sicurezza.md).

## Chi può modificare dal pannello

Il pannello non ha utenti propri: l'accesso lo decide **GitHub**.

- Può accedere e salvare chi ha **accesso in scrittura** al repository (collaboratore, o
  membro di un team dell'organizzazione). Chi ha solo lettura **non riesce nemmeno ad
  accedere**. Ogni editor ha bisogno di un account GitHub.
- **Non si possono dare permessi diversi per collezione**: chi entra vede e modifica tutto.
- Per far **approvare** le modifiche si può attivare `publish_mode: editorial_workflow` in
  `config.yml` (non attivo di base): ogni modifica diventa una *pull request* che qualcuno
  deve pubblicare. Con la **protezione del ramo `main`** su GitHub si decide chi può unirla.
- Senza flusso editoriale e con `main` protetto, chi non può scrivere su `main` vede il
  pannello in sola lettura.

## GDPR: cosa fa già la base

- **Caratteri self-hosted** (Fontsource): nessuna richiesta a Google Fonts
- **Pannello servito dal nostro dominio**: Sveltia arriva dal pacchetto npm (copiato in
  `public/admin/vendor/`) e non dalla versione CDN, che caricherebbe risorse da unpkg e
  jsDelivr. Il pannello parla solo con GitHub e col servizio OAuth; prima del login
  controlla lo stato di GitHub (`githubstatus.com`, un servizio di GitHub)
- **Nessun cookie** e nessuno strumento di analisi
- **Video YouTube a due clic**: nulla viene caricato da YouTube finché
  il visitatore non lo chiede, poi si usa `youtube-nocookie.com`
- **Nessun modulo di contatto**: solo email e telefono cliccabili
- **Condivisione social** (facoltativa): semplici link a X e Facebook, senza script né
  pulsanti ufficiali; nessuna richiesta a terzi finché il visitatore non clicca

Con questa configurazione di solito **non serve un banner cookie**.
Va però sempre scritta un'informativa privacy (trattamenti dell'hosting,
email di contatto, eventuali iscrizioni).

### Cose da valutare caso per caso

- **Hosting**: Netlify, Cloudflare e GitHub sono aziende USA. Si possono
  usare con DPA e clausole contrattuali standard, ma per clienti più
  sensibili si può pubblicare `dist/` su un hosting con sede in UE.
- **Statistiche**: se servono, scegliere uno strumento senza cookie e
  ospitato in UE (es. Plausible o Umami self-hosted) e citarlo
  nell'informativa.
- **Moduli** (contatti, iscrizioni gare): richiedono un servizio che
  riceve dati personali; scegliere un fornitore UE e aggiornare
  l'informativa.
- **Mappe**: stesso schema del video (caricamento al clic) oppure
  un'immagine statica con link.

Queste note sono indicazioni tecniche, non consulenza legale: per ogni
cliente l'informativa va verificata da chi se ne occupa.

## Manutenzione

- `npm run check` controlla i tipi di tutto il codice (`astro check`, modalità strict):
  va lanciato dopo ogni modifica ai componenti; la build da sola non li controlla
- Gli script di installazione dei pacchetti sono approvati uno per uno nel campo `allowScripts`
  di `package.json` (oggi solo `esbuild`, legato alla versione). Dopo un aggiornamento di
  esbuild l'avviso `allow-scripts` ricompare: si riapprova con `npm approve-scripts esbuild`
  (`npm approve-scripts --allow-scripts-pending` elenca cosa manca)
- `npm outdated` / `npm update` una volta ogni qualche mese
- **Sveltia CMS è ancora in beta** (modifiche incompatibili possibili prima della 1.0, prevista
  senza garanzie per fine 2026). La versione è fissata in `package.json` senza `^` e si
  aggiorna a mano, dopo aver letto le note di rilascio: `npm install` (rigenera
  `public/admin/vendor/`), poi aprire `/admin/index.html`, controllare che l'interfaccia sia
  in italiano, che la console del browser non mostri errori e che nella scheda Rete non ci
  siano richieste a terzi oltre a `githubstatus.com`; aprire i moduli, salvare una voce di
  ogni tipo e controllare `git diff` e `npm run build`. Lo script `copy-sveltia.mjs` usa
  esbuild perché il pacchetto importa le lingue come moduli JSON: se un aggiornamento cambia
  la struttura del pacchetto può servire adattarlo
- Per portare un miglioramento della base in un sito cliente già
  esistente (il remote `base` c'è già se il sito è stato creato con la
  checklist sopra):
  ```bash
  git fetch base
  git merge base/main   # risolvere eventuali conflitti
  ```
  Se il remote `base` non esiste (sito creato in altro modo), aggiungilo prima
  con `git remote add base https://github.com/brainylabs/brainy-starter.git`.

### Piano B: tornare a Decap

Prima di Sveltia la base usava Decap CMS. Se Sveltia desse problemi, il tag Git `decap-final`
conserva l'ultima versione con Decap. Contenuti, schema e sito non cambiano, e `config.yml` si legge
con entrambi i programmi (con piccole differenze di opzioni). È il vantaggio di un CMS basato
su file: i contenuti sono Markdown e JSON, non sono prigionieri di nessun software.
