# src/brand — personalizzazioni di un cliente

Questa cartella è l'unico posto della base pensato per essere **modificato nel repository
di un cliente**. Nella base contiene file vuoti: i componenti della base li includono
sempre, ma senza disegnare nulla.

| File | Dove viene usato | Cosa metterci |
|---|---|---|
| `PageHeaderDecor.astro` | Dietro la fascia delle pagine interne | Illustrazione, motivo, immagine di sfondo |
| `FooterDecor.astro` | Subito sopra il piè di pagina | Sagoma decorativa, separatore illustrato |
| `brand.css` | Tutte le pagine | Stili specifici (bordi, ombre, dettagli) |

Per i colori, i caratteri e i testi **non** si usa questa cartella: si impostano dal
pannello (Impostazioni → Aspetto e Dati del sito).

## Perché una cartella a parte

Aggiornare un sito cliente con i miglioramenti della base (`git merge base/main`) non
deve creare conflitti. Se le personalizzazioni stanno solo in `src/brand/`,
`src/content/`, `src/data/` e `public/uploads/`, e la base modifica gli altri file, i due
insiemi non si sovrappongono.
