# Configuración de Supabase para probar la Fase 2

Esta guía deja el proyecto listo para ejecutar las migraciones y probar los flujos reales de la Fase 2. No contiene claves ni credenciales.

> Estado: **migraciones ejecutadas y validación completa** el 11 de noviembre de 2026 contra el proyecto real. Se probaron los flujos principales, el aislamiento entre dos cuentas (19/19) y la recuperación por enlace de correo. La Fase 2 sigue pendiente de aprobación explícita. El detalle está en [`docs/fase-2/README.md`](../fase-2/README.md).

---

## 1. Crear el proyecto

1. Entrar a <https://supabase.com/dashboard>.
2. Crear un proyecto de desarrollo (por ejemplo, `syntropy-dev`).
3. Elegir una región cercana y guardar la contraseña de la base de datos en un gestor de contraseñas.
4. Esperar a que el proyecto termine de aprovisionarse.

No hace falta instalar Docker para usar un proyecto en la nube. Docker solo sería necesario para levantar Supabase local.

---

## 2. Completar `.env.local`

En **Project Settings → API** (o **API Keys**) copiar:

- **Project URL**
- **anon public key** o **publishable key** (la clave pública; nunca la `secret` ni la `service_role`)

Luego, desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Completar:

```dotenv
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_PUBLICA
VITE_APP_URL=http://localhost:5173
VITE_APP_ENV=development
```

Reglas:

- La `anon key` es pública: puede estar en el frontend. La seguridad depende de RLS.
- La `service_role` **nunca** va en `.env.local`, en Vite, en Tauri ni en Capacitor.
- `.env.local` está ignorado por Git. No commitear claves reales.
- `VITE_APP_URL` debe coincidir con la URL desde la que se abre la app, porque se usa para construir los enlaces de confirmación y recuperación.

---

## 3. Configurar Auth

En **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:5173`
- **Redirect URLs:**
  - `http://localhost:5173/auth/callback`
  - `http://localhost:5173/restablecer-contrasena`
  - `http://127.0.0.1:5173/auth/callback`
  - `http://127.0.0.1:5173/restablecer-contrasena`

Si se va a probar desde un teléfono en la red local, agregar también la URL de la computadora, por ejemplo:

```text
http://192.168.1.50:5173/**
```

En **Authentication → Providers → Email**:

- Dejar habilitado el proveedor de correo.
- Mantener la confirmación de correo activada para probar el flujo real.
- El servicio de correo gratuito de Supabase tiene límites y puede demorar. Para producción habrá que configurar SMTP propio.

La app usa el flujo implícito de Supabase para que los enlaces de correo funcionen aunque se abran en otro navegador. No cambiar el flujo sin revisar `src/lib/supabase.ts` y las pruebas de Auth.

---

## 4. Aplicar las migraciones

En **SQL Editor**, crear una consulta nueva y ejecutar, en este orden:

1. Todo el contenido de `supabase/migrations/001_schema_inicial.sql`.
2. Todo el contenido de `supabase/migrations/002_ajustes_fase2.sql`.

Cada archivo abre y cierra su propia transacción. Si algo falla, no continuar con el siguiente.

### Verificación mínima

Ejecutar en el SQL Editor:

```sql
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;

select id, name, public
from storage.buckets
where id in ('avatars', 'academic-files');

select proname
from pg_proc
where proname in ('activate_academic_year', 'delete_current_user')
order by proname;
```

Resultado esperado:

- tablas de perfiles, años, asignaturas, nodos, fuentes, tareas y evaluaciones/notas (`assessments`);
- dos buckets privados: `avatars` y `academic-files`;
- las funciones `activate_academic_year` y `delete_current_user`.

En la ejecución real del 11/11/2026 se confirmaron las tablas mediante la API REST (`profiles`, `academic_years`, `subjects`, `nodes`, `sources`, `tasks` y `assessments` devolvieron `200`). El avatar se subió correctamente al bucket privado `avatars` y se accedió con URL firmada; el bucket `academic-files` existe en la migración, pero no se usó porque la carga de archivos corresponde a una fase posterior.

Para comprobar que RLS está activo:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
order by relname;
```

Todas las tablas de datos deben mostrar `relrowsecurity = true`. El SQL Editor se ejecuta como administrador y **omite RLS**, así que la prueba real de aislamiento se hace desde la app. En la validación del 11/11/2026 se comprobó desde la API que un usuario anónimo no ve filas, que un usuario autenticado ve las propias, que un insert con otro `user_id` devuelve `403` (`42501`), que un update/delete sobre una fila ajena afecta `0` filas y que los buckets `avatars` y `academic-files` rechazan el acceso cruzado con `400`. La prueba con dos cuentas reales se completó con 19/19 comprobaciones.

---

## 5. Ejecutar la app

```powershell
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
npm run dev
```

Abrir <http://localhost:5173>. Si la configuración es correcta, la app no debe redirigir a `/configuracion-inicial`.

---

## 6. Checklist de pruebas reales

Marcar cada punto solo después de comprobarlo en el navegador contra Supabase:

- [x] Registro con correo, nombre, usuario y los tres consentimientos.
- [x] Llegada del correo de confirmación y retorno a `/auth/callback`.
- [x] Inicio de sesión con el correo confirmado.
- [x] Recuperación de contraseña mediante el enlace del correo y retorno a `/restablecer-contrasena`.
- [x] Formulario de `/restablecer-contrasena` y actualización de contraseña con una sesión válida.
- [x] Onboarding: nombre y creación del primer año.
- [x] Perfil: edición de nombre, usuario, zona horaria y avatar.
- [x] Cambio de contraseña y nuevo ingreso con la contraseña actualizada.
- [x] Creación de un segundo año y activación de uno solo.
- [x] Borrado de un año inactivo.
- [x] Creación, edición, detalle y borrado de una asignatura.
- [x] Cierre de sesión y nuevo ingreso.
- [x] Aislamiento con dos cuentas: la cuenta B no ve años, asignaturas ni archivos de la cuenta A.
- [x] Eliminación de cuenta, limpieza del avatar y comprobación de que ya no puede ingresar.

La recuperación por enlace se completó: el correo llegó, el enlace abrió `/restablecer-contrasena`, la contraseña se actualizó desde la app y el login con la contraseña anterior devolvió `400`. El límite `over_email_send_rate_limit` (429) del servicio integrado sigue siendo una limitación real de frecuencia: para crear la segunda cuenta se desactivó temporalmente “Confirm email” y hay que asegurarse de volver a activarlo. Para producción corresponde configurar SMTP propio.

### Limitaciones conocidas

- La eliminación de cuenta ahora limpia el avatar y los archivos de `academic-files` antes de ejecutar `delete_current_user`. Se comprobó que el objeto del avatar desaparece del origen (`NoSuchKey`). Una URL firmada que ya estaba en caché del CDN puede seguir respondiendo hasta que expire su TTL; es una limitación del almacenamiento, no de la base.
- El borrado del año activo se bloquea en la interfaz y en el servicio (`is_active=false`), según D26. No hay una restricción de base de datos; una llamada directa a la API con la sesión del dueño todavía podría borrarlo. La app no ofrece ese camino.

### Si un correo no llega

1. Revisar spam.
2. Verificar que la URL de redirección esté en la lista de Auth.
3. Revisar **Authentication → Users** y los logs de Auth.
4. Repetir el envío desde la app; hay límites de frecuencia.

---

## 7. Qué hacer después

El 11/11/2026 se ejecutaron las migraciones y se completó la validación real de la Fase 2, incluidas las dos pruebas que dependían del correo. La fase queda a la espera de aprobación explícita.

Antes de producción:

1. Configurar SMTP propio y plantillas de correo.
2. Verificar que “Confirm email” esté reactivado en Auth.
3. Instalar la PWA en un dispositivo y compilar Tauri/Android/iOS.
4. Revisar el reporte completo en [`docs/fase-2/README.md`](../fase-2/README.md).

Si se prefiere probar sin un proyecto en la nube, la alternativa es instalar Docker Desktop y usar Supabase local. En esta máquina Docker no está instalado y el CLI de Supabase no puede levantar el stack sin Docker.
