# Configuración de Supabase para probar la Fase 2

Esta guía deja el proyecto listo para ejecutar las migraciones y probar los flujos reales de la Fase 2. No contiene claves ni credenciales.

> Estado: **pendiente de ejecución**. La Fase 2 está implementada y validada localmente, pero todavía no se ejecutó contra un proyecto real de Supabase.

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

- tablas de perfiles, años, asignaturas, nodos, fuentes, tareas, evaluaciones y calificaciones;
- dos buckets privados: `avatars` y `academic-files`;
- las funciones `activate_academic_year` y `delete_current_user`.

Para comprobar que RLS está activo:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
order by relname;
```

Todas las tablas de datos deben mostrar `relrowsecurity = true`. El SQL Editor se ejecuta como administrador y **omite RLS**, así que la prueba real de aislamiento se hace desde la app con dos cuentas distintas.

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

- [ ] Registro con correo, nombre, usuario y los tres consentimientos.
- [ ] Llegada del correo de confirmación y retorno a `/auth/callback`.
- [ ] Inicio de sesión con el correo confirmado.
- [ ] Recuperación de contraseña y retorno a `/restablecer-contrasena`.
- [ ] Onboarding: nombre y creación del primer año.
- [ ] Perfil: edición de nombre, usuario, zona horaria y avatar.
- [ ] Cambio de contraseña.
- [ ] Creación de un segundo año y activación de uno solo.
- [ ] Intento de borrar el año activo (debe impedirse).
- [ ] Creación, edición, detalle y borrado de una asignatura.
- [ ] Cierre de sesión y nuevo ingreso.
- [ ] Aislamiento con dos cuentas: la cuenta B no ve años, asignaturas ni archivos de la cuenta A.
- [ ] Eliminación de cuenta y comprobación de que ya no puede ingresar.

### Limitación conocida

La eliminación de cuenta borra los datos de las tablas, pero todavía no limpia los archivos de Storage. Queda pendiente para antes de producción.

### Si un correo no llega

1. Revisar spam.
2. Verificar que la URL de redirección esté en la lista de Auth.
3. Revisar **Authentication → Users** y los logs de Auth.
4. Repetir el envío desde la app; hay límites de frecuencia.

---

## 7. Qué hacer después

Cuando el checklist esté completo, actualizar `docs/fase-1/06-modelo-datos.md` con los resultados reales y recién entonces presentar la Fase 2 para aprobación explícita.

Si se prefiere probar sin un proyecto en la nube, la alternativa es instalar Docker Desktop y usar Supabase local. En esta máquina Docker no está instalado y el CLI de Supabase no puede levantar el stack sin Docker.
