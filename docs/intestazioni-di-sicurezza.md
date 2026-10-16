# Intestazioni di sicurezza

Il sito è HTML statico. La **CSP** principale (quali script, stili, immagini e iframe
sono ammessi) sta già in un `<meta>` dentro ogni pagina, quindi vale su qualunque hosting.

Alcune protezioni però funzionano solo come **intestazioni HTTP** inviate dal server.
Vanno configurate sull'hosting.

## Cosa serve

| Percorso | Intestazione | Valore | A cosa serve |
| --- | --- | --- | --- |
| tutto il sito | `X-Content-Type-Options` | `nosniff` | il browser non "indovina" il tipo dei file |
| tutto il sito | `Referrer-Policy` | `strict-origin-when-cross-origin` | agli altri siti arriva solo il dominio, non l'indirizzo completo |
| tutto il sito | `X-Frame-Options` | `DENY` | il sito non può essere caricato in un iframe da altri |
| tutto il sito | `Content-Security-Policy` | `frame-ancestors 'none'` | come sopra, per i browser moderni (nel `<meta>` non funziona) |
| tutto il sito | `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | nessuna pagina può chiedere fotocamera, posizione, … |
| `/uploads/*` e `/media/*` | `Content-Security-Policy` | `default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; frame-ancestors 'none'` | un SVG caricato da un editor non può eseguire script |

Per la stessa CSP le immagini devono stare sul sito: un indirizzo esterno scritto nel CMS
(`https://altro-sito/foto.jpg`) non viene mostrato.

## Dove si configurano

- **Netlify e Cloudflare Pages**: già fatto, con il file `apps/site/public/_headers`
  (finisce in `dist/` con la build).
- **Vercel**: sezione `headers` in `vercel.json`.
- **Apache**: `Header set …` in `.htaccess` (serve `mod_headers`).
- **nginx**: per esempio

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Frame-Options "DENY" always;
add_header Content-Security-Policy "frame-ancestors 'none'" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;

location ~ ^/(uploads|media)/ {
    # in nginx un add_header nel location sostituisce quelli esterni: vanno ripetuti tutti
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "DENY" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
    add_header Content-Security-Policy "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; frame-ancestors 'none'" always;
}
```

## Come controllare

Dopo la pubblicazione: `curl -I https://dominio/` e `curl -I https://dominio/uploads/<file>`
devono mostrare le intestazioni qui sopra.
