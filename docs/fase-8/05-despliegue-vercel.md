# Despliegue en Vercel y puesta en marcha de los correos

**Estado:** guía preparada el 13 de noviembre de 2026. El hosting elegido es Vercel y el repositorio ya tiene [`vercel.json`](../../vercel.json). Faltan las cuentas, el dominio y los datos del responsable.

> No guardar claves en el repositorio ni en capturas. La `service_role` de Supabase **nunca** va al frontend ni a Vercel. En Vercel solo van las variables `VITE_*` públicas.

---

## 1. Lo que hay que tener a mano

- Cuenta de Vercel conectada a GitHub.
- Dominio propio con acceso al DNS (por ejemplo, `syntropy.app`).
- Cuenta de Resend y un dominio verificado para enviar correos.
- Cuenta de Supabase con acceso al proyecto `rsxvugjdyarvpthidpya`.
- Los datos públicos del responsable: nombre o razón social, correo de contacto y domicilio.

---

## 2. Publicar la PWA en Vercel

1. Entrar a <https://vercel.com/new> e importar el repositorio `marcelodanielsanchez5-droid/Syntropy`.
2. Confirmar:
   - Framework: **Vite**.
   - Build Command: `npm run build`.
   - Output Directory: `dist`.
   - El archivo `vercel.json` ya define la regla de SPA, la caché de assets y las cabeceras de seguridad.
3. Cargar las variables de entorno de **Production** (y, si se usan, Preview y Development):

   | Variable | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://rsxvugjdyarvpthidpya.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | La clave publishable del proyecto (la misma de `.env.local`). |
   | `VITE_APP_URL` | `https://TU-DOMINIO` (sin barra final). |
   | `VITE_APP_ENV` | `production`. |
   | `VITE_LEGAL_OWNER` | Nombre o razón social del responsable. |
   | `VITE_LEGAL_CONTACT_EMAIL` | Correo de contacto para privacidad. |
   | `VITE_LEGAL_LOCATION` | Ciudad, provincia y país del responsable. |

   No cargar `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` ni `CRON_SECRET` en Vercel.

4. Desplegar y probar la URL `*.vercel.app` antes de conectar el dominio.
5. Agregar el dominio en **Settings → Domains** y seguir los registros DNS que indique Vercel.
6. En Supabase, ir a **Authentication → URL Configuration** y configurar:
   - **Site URL:** `https://TU-DOMINIO`.
   - **Redirect URLs:** `https://TU-DOMINIO/auth/callback` y `https://TU-DOMINIO/restablecer-contrasena`.
   - Para desarrollo, mantener también `http://127.0.0.1:5173/auth/callback` y `http://127.0.0.1:5173/restablecer-contrasena`.
7. Probar registro, confirmación por correo, recuperación y cambio de contraseña con el dominio final.

---

## 3. Verificar el dominio en Resend

1. Crear una cuenta en <https://resend.com>.
2. Agregar el dominio (se recomienda un subdominio de envío, por ejemplo `mail.TU-DOMINIO`).
3. Copiar los registros DNS que muestra Resend: SPF, DKIM y, si se puede, DMARC. Esperar a que el estado sea **Verified**.
4. Crear una **API key** con permiso solo de envío y guardarla en un lugar seguro. No pegarla en el repositorio.
5. Elegir el remitente, por ejemplo: `Syntropy <recordatorios@mail.TU-DOMINIO>`.

Sin un dominio verificado, Resend solo permite enviar al correo del dueño de la cuenta. Eso sirve para una prueba, no para usuarios reales.

---

## 4. Desplegar `send-reminders` en Supabase

En una terminal, desde la raíz del proyecto:

```powershell
npx.cmd --yes supabase@latest login
npx.cmd --yes supabase@latest link --project-ref rxvugjdyarvpthidpya
```

`login` abre el navegador o pide un token. El token se puede crear en <https://supabase.com/dashboard/account/tokens>.

Después, cargar los secretos de la función. Reemplazar los valores entre comillas y generar un `CRON_SECRET` largo y aleatorio:

```powershell
npx.cmd --yes supabase@latest secrets set `
  RESEND_API_KEY="re_..." `
  REMINDER_FROM_EMAIL="Syntropy <recordatorios@mail.TU-DOMINIO>" `
  CRON_SECRET="UNA_CADENA_LARGA_Y_ALEATORIA" `
  APP_URL="https://TU-DOMINIO"
```

Desplegar sin verificación de JWT (la protege `x-cron-secret`):

```powershell
npx.cmd --yes supabase@latest functions deploy send-reminders --no-verify-jwt
```

Comprobar que la función responde y que los secretos quedaron cargados en **Edge Functions → send-reminders → Secrets**.

---

## 5. Programar pg_cron

En el **SQL Editor** de Supabase, ejecutar [`programar-recordatorios.sql`](../../supabase/setup/programar-recordatorios.sql) después de reemplazar:

- `https://REEMPLAZAR.supabase.co` por `https://rsxvugjdyarvpthidpya.supabase.co`;
- `REEMPLAZAR-POR-EL-MISMO-VALOR-QUE-CRON_SECRET` por el mismo `CRON_SECRET` del paso anterior.

El script:

- activa `pg_cron` y `pg_net`;
- guarda la URL y el secreto en Vault;
- programa una llamada cada 5 minutos;
- incluye consultas para revisar ejecuciones y respuestas.

No commitear el archivo con los valores reales.

---

## 6. Probar el circuito completo

1. En la app, iniciar sesión con una cuenta de prueba verificada.
2. Ir a **Configuración → Recordatorios por correo**, activarlos y tocar **Enviar prueba**.
3. Esperar hasta 5 minutos. Revisar la bandeja de entrada y spam.
4. En el SQL Editor, comprobar:
   - `select jobid, schedule, active from cron.job;`
   - `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;`
   - `select status_code, content, created from net._http_response order by created desc limit 10;`
   - `select kind, status, send_at, attempts, error_message from public.reminders order by send_at desc limit 20;`
5. Probar también una tarea con vencimiento próximo, mover la fecha y cancelar el aviso.
6. Repetir con una cuenta B para confirmar que cada correo va solo a su dirección.

---

## 7. Antes de abrir el registro

- [ ] Dominio verificado en Resend y probado en Gmail y Outlook.
- [ ] `send-reminders` desplegada y pg_cron activo.
- [ ] Correo de prueba recibido y registrado en «Últimos correos».
- [ ] Confirmación y recuperación de Supabase con el dominio final.
- [ ] Variables legales cargadas y textos sin «[dato pendiente]».
- [ ] Revisión legal profesional terminada.
- [ ] Respaldo de la base probado.
- [ ] Cuentas A/B y datos de prueba eliminados.
