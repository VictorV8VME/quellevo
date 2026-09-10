# QuéLlevo

App web gratis (celular) para asados, fiestas y cenas: cada uno marca qué lleva.

## Probar

Abrí la carpeta en Vercel o un server estático (`npx serve .`).

- Landing: `/` (sin query)
- Evento: `/?e=CODIGO` (también acepta `?c=`)
- Negocios: `/?biz=1`
- Privacidad: `/privacy.html`

## Sync entre celulares

1. Corré `supabase-quellevo.sql` (base + bloque MVP+ al final) en el SQL Editor de Supabase.
2. Hard refresh. Sin eso, funciona en modo local (un solo celular + localStorage).

## MVP+

- Landing con valor prop, cómo funciona, demo, crear.
- Share: link completo, Copiar, WhatsApp, toast.
- Categorías de ítems (agrupadas).
- RSVP Voy / Tal vez / No voy (localStorage + `quellevo_rsvps` o `guests` jsonb).
- Fecha / lugar en crear y header.
- Panel negocios (`?biz=1`): insert pending o mailto.
- Trust: texto de nombre, privacy.html, footer.

## Monetización suave (ofertas)

- Demo local en `app.js` si no hay filas activas.
- Inserts públicos con `pending=true`, `active=false` hasta moderar.
- Contacto: `config.js` → `bizEmail` / `bizWhatsApp`.
