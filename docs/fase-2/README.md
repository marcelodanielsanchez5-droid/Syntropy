# Fase 2 — Validación real

**Estado:** implementación completa en el cliente; flujos principales probados contra Supabase real el 11 de noviembre de 2026. **La fase todavía no está aprobada** y no está lista para producción.

**Alcance:** autenticación, confirmación de correo, onboarding, perfil, avatar, años de curso, asignaturas, RLS y eliminación de cuenta.

---

## 1. Resultado ejecutivo

La Fase 2 funciona contra el proyecto real de Supabase en los flujos principales. Se aplicaron las migraciones `001` y `002`, se creó una cuenta real con confirmación por correo, se completó el onboarding y se recorrieron perfil, años, asignaturas, cambio de contraseña y eliminación de cuenta.

También se comprobó que RLS bloquea el acceso anónimo, rechaza inserts con otro `user_id` y no permite modificar ni borrar filas ajenas. El avatar se subió a un bucket privado y se accedió mediante URL firmada.

Quedaron dos pendientes de validación:

1. **Aislamiento con dos cuentas confirmadas.** No se llegó a tener dos cuentas confirmadas al mismo tiempo. El servicio de correo integrado de Supabase alcanzó su límite (`over_email_send_rate_limit`, HTTP 429) e impidió crear una cuenta nueva; se recuperó una cuenta pendiente anterior, pero la cuenta original ya se había eliminado.
2. **Recuperación de contraseña mediante el enlace del correo.** El formulario y la pantalla de nueva contraseña se probaron con una sesión válida, pero no se pudo emitir ni abrir un enlace de recuperación real por el mismo límite.

Ninguno de los dos pendientes es un fallo del cliente. Para completarlos hay que esperar a que se libere el límite, configurar SMTP propio o usar un proyecto de prueba con otro límite.

Las cuentas de prueba se eliminaron desde la app al terminar; no se dejaron credenciales ni datos personales de prueba en el repositorio.

---

## 2. Pruebas ejecutadas

| Área | Prueba | Resultado |
|---|---|---|
| Migraciones | `001` y `002` aplicadas en el SQL Editor | Correcto |
| Tablas | `profiles`, `academic_years`, `subjects`, `nodes`, `sources`, `tasks`, `assessments` por REST | `200` |
| Auth | Registro con correo temporal, usuario, nombre y tres consentimientos | Correcto |
| Auth | Correo de confirmación recibido y enlace abierto | Correcto |
| Auth | Retorno a `/auth/callback` y sesión implícita | Correcto |
| Onboarding | Dos pasos y creación del primer año `2026` | Correcto |
| Perfil | Edición de nombre y zona horaria | Correcto |
| Perfil | Subida de avatar, URL firmada y visualización | Correcto |
| Años | Crear un año inactivo, activarlo y volver al año original | Correcto |
| Años | Borrar un año inactivo | Correcto |
| Años | Intentar borrar el año activo | Botón deshabilitado y aviso visible (cuenta A) |
| Asignaturas | Alta con dos docentes, color y criterios | Correcto |
| Asignaturas | Detalle, edición y tarjeta en el home | Correcto |
| Asignaturas | Borrado con confirmación | Correcto |
| Contraseña | Cambio desde el perfil y cierre de sesión | Correcto |
| Contraseña | Nuevo ingreso con la contraseña actualizada | Correcto |
| Contraseña | Formulario `/restablecer-contrasena` con sesión válida | Correcto |
| Recuperación | Solicitud de enlace por correo | Bloqueada por límite 429 de Supabase |
| RLS | Lectura anónima de perfiles y años | `0` filas |
| RLS | Lectura del usuario autenticado | Solo filas propias |
| RLS | Insert con `user_id` ajeno | `403`, código `42501` |
| RLS | Update/delete sobre fila ajena | `0` filas afectadas |
| Storage | Avatar público o anónimo | `400` |
| Storage | Avatar del dueño autenticado | `200` |
| Cuenta | Eliminación con confirmación `ELIMINAR` | Correcto |
| Cuenta | Login posterior a la eliminación | Falla, como se espera |
| Cuenta | Borrado del avatar en el origen | `NoSuchKey` |
| Calidad | `npm run typecheck` | Sin errores |
| Calidad | `npm test` | 55 pruebas aprobadas en 5 archivos |
| Calidad | `npm run build` | Correcto; aviso de bundle de ~966 kB |

### 2.1. Detalle de los flujos

- **Registro:** se usó un buzón temporal externo, no una cuenta personal. El correo de confirmación llegó y el enlace se abrió en el mismo navegador de prueba. El flujo implícito permitió crear la sesión en `/auth/callback`.
- **Onboarding:** el primer año se creó como `2026`, activo, con fechas `2026-03-01` a `2026-12-20`.
- **Perfil:** se cambió el nombre a “Cuenta de prueba actualizada” y se subió un PNG de 192×192. La URL firmada del avatar se generó correctamente.
- **Años:** se creó “Año temporal 2027” inactivo, se activó, se volvió a activar `2026` y se eliminó el año temporal. La interfaz reflejó el año activo en el encabezado.
- **Asignaturas:** se creó “Matemática” con Laura Gómez y Ana Pérez, se editó a “Matemática II”, se verificó en el home y se eliminó.
- **Contraseña:** el cambio desde el perfil cerró la sesión y el ingreso con la contraseña nueva funcionó.
- **Eliminación:** el diálogo exigió escribir `ELIMINAR`; después de borrar, el login con las mismas credenciales falló y el avatar ya no existía en el origen.

---

## 3. Evidencia de seguridad

| Comprobación | Respuesta |
|---|---|
| `GET /rest/v1/profiles` sin sesión | `200 []` |
| `GET /rest/v1/academic_years` sin sesión | `200 []` |
| `GET /rest/v1/profiles` con sesión | Solo el perfil propio |
| `POST /rest/v1/academic_years` con `user_id` aleatorio | `403` / `42501` |
| `PATCH` de un año ajeno | `200`, `0` filas |
| `DELETE` de un año ajeno | `200`, `0` filas |
| Avatar en bucket público | `400` |
| Avatar autenticado como anónimo | `400` |
| Avatar autenticado como dueño | `200` |
| Avatar después de borrar la cuenta, evitando caché | `404 NoSuchKey` |

La prueba de dos cuentas queda pendiente. La evidencia anterior cubre los controles de inserción, modificación, borrado y acceso anónimo, pero no la lectura cruzada entre dos usuarios autenticados.

### 3.1. Caché del CDN

Una URL firmada del avatar puede seguir respondiendo desde la caché del CDN después de borrar el objeto. En la prueba, la respuesta cacheada tenía `Cf-Cache-Status: HIT` y `Age` de varios minutos; al pedir el mismo recurso con `Cache-Control: no-cache`, el origen respondió `404 NoSuchKey`. Es una limitación del almacenamiento y de las URLs firmadas, no de la base. Para producción conviene definir una política de caché más corta para archivos privados o aceptar que una URL ya emitida pueda servir el archivo hasta que expire.

---

## 4. Correcciones aplicadas durante la validación

1. **Mensajes de Auth en español:** `getErrorMessage` ahora revisa el código del error antes de devolver el mensaje crudo. El límite de correo se muestra como “Enviaste demasiados correos seguidos. Esperá unos minutos antes de volver a intentar.” Se agregó una prueba unitaria; el total pasó de 51 a 52.
2. **Limpieza de Storage al eliminar la cuenta:** `deleteCurrentAccount` recorre `avatars` y `academic-files` del usuario, borra los archivos y recién después ejecuta `delete_current_user`. Se comprobó el borrado del avatar en el origen.
3. **Correcciones previas de Fase 2:** zonas horarias sin opciones en blanco, encabezado duplicado en tablet, contraste de texto deshabilitado y revisión visual responsive.
4. **Bloqueo del borrado del año activo (D26):** la fila del año activo deshabilita el botón de eliminar, muestra el aviso “Para eliminarlo, activá otro año primero” y `deleteYear` agrega el filtro `is_active=false`. Si la fila desaparece entre la consulta y el borrado, el servicio vuelve a leer el año para distinguir “año activo” de “año inexistente”. Se agregaron tres pruebas unitarias (total: 55) y se verificó en la interfaz real con la cuenta A: el botón quedó deshabilitado y el aviso visible.

No se modificó el esquema de la base ni las políticas RLS durante esta validación.

---

## 5. Pendientes y riesgos

### Bloqueantes para aprobar la fase

- [ ] Probar el aislamiento con dos cuentas confirmadas, incluyendo años, asignaturas y Storage.
- [ ] Probar el enlace real de recuperación de contraseña cuando el límite de correo lo permita.

### Antes de producción

- [ ] Configurar SMTP propio y plantillas de correo; el servicio integrado de Supabase tiene límites.
- [ ] Instalar la PWA en un dispositivo real y repetir la revisión visual con datos reales.
- [ ] Compilar y probar Tauri/Windows, Android e iOS; en esta máquina no están disponibles Rust/MSVC, Android Studio ni macOS.
- [ ] Reducir el bundle principal (~966 kB, ~280 kB gzip) con división de código.
- [ ] Revisar los 6 avisos de `npm audit` de la cadena de desarrollo de `vite-plugin-pwa`/`workbox-build`.
- [ ] Probar `academic-files` con archivos reales; en Fase 2 solo se usó `avatars`.
- [x] Bloquear el borrado del año activo (D26): la interfaz deshabilita la acción y el servicio filtra `is_active=false`. Verificado en la interfaz real con la cuenta A.
- [ ] Medir índices y planes de consulta con un volumen representativo.
- [ ] Ejecutar las pruebas de notas y plan de estudio cuando existan las fases correspondientes.

### Decisión D26: borrado del año activo

El 11 de noviembre de 2026 se aprobó impedir que el año activo se elimine. La fila activa muestra el botón de borrado deshabilitado y el servicio agrega `is_active=false` al `DELETE`, de modo que la operación no depende solo de la interfaz. Esta regla no requiere cambios de esquema ni de RLS.

### Estado de empaquetado

- Web/PWA: build de producción generado; service worker, manifest y recarga offline verificados en Edge.
- Windows/Tauri: no compilado; falta el entorno Rust/MSVC.
- Android/Capacitor: no compilado; falta Android Studio.
- iOS/Capacitor: no compilado; requiere macOS.

---

## 6. Recomendación

La Fase 2 está funcionalmente completa y los flujos principales están probados con datos reales. Antes de declararla aprobada conviene completar las dos pruebas bloqueadas por el límite de correo o aceptar explícitamente que se validarán al configurar SMTP. No debe declararse “lista para producción” todavía.

Para reproducir las pruebas:

```powershell
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
npm run dev
```

Las credenciales reales viven en `.env.local`, que está ignorado por Git. No se guardaron claves `service_role`, secretas ni contraseñas de usuarios reales en el repositorio ni en la documentación.
