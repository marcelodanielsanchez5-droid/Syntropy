# Backend local de pruebas

Herramienta de desarrollo, **no forma parte de la app ni se publica**. Sirve para probar Syntropy sin un proyecto de Supabase:

- PostgreSQL embebido ([PGlite](https://pglite.dev)) con las migraciones reales de `supabase/migrations`, roles `anon`, `authenticated` y `service_role`, `auth.uid()` y RLS de verdad.
- Una API mínima compatible con el cliente de Supabase: Auth (contraseña, registro y refresco), REST (filtros de PostgREST y RPC) y Storage en memoria.
- La Edge Function `send-reminders` con el mismo `handler.ts` que se despliega, pero con un Resend simulado: los correos quedan en memoria.

Todo vive en memoria: al reiniciar se vuelve a crear la base con los datos de ejemplo de `seed.mjs` (fechas relativas a hoy). Los tokens no se firman. **No usar nunca con datos reales.**

## Uso

Requiere Node 23.6 o más nuevo (para importar el `handler.ts` de la función sin compilar).

```bash
cd tools/dev-backend
npm install
npm run validate   # comprobaciones de la base: migraciones, RLS, permisos, límites, recordatorios y textos legales
npm start          # API en http://127.0.0.1:54321
```

Para que la app use este backend, en `.env.local` de la raíz:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=clave-local-de-prueba
```

y en otra terminal `npm run dev`. La cuenta de ejemplo está en `seed.mjs` (es solo de esta base en memoria).

## Rutas de desarrollo

| Ruta | Qué hace |
|---|---|
| `GET /__dev/outbox` | Correos «enviados» por el Resend simulado |
| `GET /__dev/outbox/<id>` | HTML de un correo |
| `POST /__dev/run-reminders` | Ejecuta la función de recordatorios ya (además corre sola cada 30 s, como pg_cron) |

Un destinatario que contenga «rebota» simula un rechazo definitivo de Resend.
