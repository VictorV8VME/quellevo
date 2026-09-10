# QuéLlevo

App web gratis (celular) para **asados y juntadas**: cada uno marca qué lleva.

## Probar

Abrí la carpeta en Vercel o un server estático (`npx serve .`).

- Landing: `/` (sin query)
- Evento: `/?e=CODIGO` (también acepta `?c=`)
- Negocios: `/?biz=1`
- Privacidad: `/privacy.html`
- 404: `/404.html`

## Sync entre celulares

1. Corré `supabase-quellevo.sql` (base + bloque MVP+ + `closed`) en el SQL Editor de Supabase.
2. Hard refresh. Sin eso, funciona en modo local (un solo celular + localStorage).
3. Si cambiás de celular, usá el mismo link; con internet se sincroniza.

## Audit / MVP+

- Posicionamiento: asados y juntadas (chips fiesta/cena).
- Demo interactiva en landing (claim/unclaim local).
- OG + Twitter meta + `og.png` / favicon.
- Tras crear: link + código grandes con botones copiar.
- Host: editar título/lugar/fecha; finalizar evento (`closed`).
- Error UI para código inválido; prompt claro si falta nombre.
- Negocios: mensaje honesto de pendiente de aprobación.
- Badge “Ofertas destacadas”.

## Monetización suave

- Demo local en `app.js` si no hay filas activas.
- Inserts públicos con `pending=true`, `active=false` hasta moderar.
