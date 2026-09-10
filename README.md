# QuéLlevo

App web gratis (celular) para asados, fiestas y cenas: cada uno marca qué lleva.

## Probar

Abrí la carpeta en Vercel o un server estático.

## Sync entre celulares

1. Corré `supabase-quellevo.sql` una vez en el SQL Editor de Supabase.
2. Hard refresh. Sin eso, funciona en modo local (un solo celular).

## Monetización suave (ofertas)

En la vista del evento aparece **Ofertas para el asado**: cards compactas de carnicerías / súper (WhatsApp o link).

- Demo local en `app.js` (`DEMO_SPONSORS`, `demo: true`) si no hay filas en Supabase.
- Tabla `quellevo_sponsors` (mismo SQL): lectura pública solo de activos; fallback a demo.
- Contacto comercios: `config.js` → `bizEmail` / `bizWhatsApp` (mailto o WA en “¿Tenés un negocio?”).
- UX: colapsable, máx. 2 visibles + “Ver más”; badge Promo / Auspicia.
