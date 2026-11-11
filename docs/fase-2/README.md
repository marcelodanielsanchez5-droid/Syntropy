# Fase 2 — Validación real

**Estado:** implementación completa en el cliente; flujos principales probados contra Supabase real el 11 de noviembre de 2026. **La fase todavía no está aprobada** y no está lista para producción.

**Alcance:** autenticación, confirmación de correo, onboarding, perfil, avatar, años de curso, asignaturas, RLS y eliminación de cuenta.

---

## 1. Resultado ejecutivo

La Fase 2 funciona contra el proyecto real de Supabase. Se aplicaron las migraciones `001` y `002`, se creó una cuenta real con confirmación por correo, se completó el onboarding y se recorrieron perfil, años, asignaturas, cambio de contraseña y eliminación de cuenta.

También se comprobó que RLS bloquea el acceso anónimo, rechaza inserts con otro `user_id`, no permite leer, modificar ni borrar filas ajenas y mantiene aislados los archivos de Storage. El avatar y un PDF de `academic-files` se subieron a buckets privados; el dueño pudo firmar y descargar, y la otra cuenta recibió `400`.

Las dos pruebas que quedaban pendientes se completaron:

1. **Aislamiento con dos cuentas.** Se confirmaron A y B, se crearon años y asignaturas para cada una y se ejecutaron 19 comprobaciones cruzadas: lectura, update, delete, insert con `user_id` ajeno, acceso anónimo, avatares y `academic-files`. Todas pasaron.
2. **Recuperación de contraseña.** Se solicitó el enlace desde `/recuperar-contrasena`, llegó el correo real a un buzón temporal, se abrió el enlace, se guardó una contraseña nueva desde la app y el ingreso con la contraseña anterior dejó de funcionar.

Para crear B se desactivó temporalmente “Confirm email” porque el servicio de correo integrado de Supabase seguía devolviendo `over_email_send_rate_limit` (HTTP 429). B quedó confirmada por autoconfirmación; el aislamiento de RLS y Storage no depende del método de confirmación. La opción debe quedar reactivada en el panel antes de continuar.

Las cuentas A y B se eliminaron al terminar (`delete_current_user` respondió `204` y el login posterior `400`); no se dejaron credenciales ni datos personales de prueba en el repositorio.

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
| Recuperación | Enlace real por correo, cambio de contraseña y login nuevo | Correcto (cuenta A) |
| Recuperación | Login con la contraseña anterior | `400`, como se espera |
| RLS | Lectura anónima de perfiles y años | `0` filas |
| RLS | Lectura del usuario autenticado | Solo filas propias |
| RLS | Lectura cruzada de años y asignaturas (A→B) | `0` filas |
| RLS | Insert con `user_id` ajeno | `403`, código `42501` |
| RLS | Update/delete sobre fila ajena | `0` filas; datos intactos |
| Storage | Avatar público o anónimo | `400` |
| Storage | Avatar del dueño autenticado | `200` |
| Storage | Firma, descarga y escritura cruzada de avatar (B→A) | `400` |
| Storage | `academic-files` propio | Subida y descarga `200` |
| Storage | `academic-files` ajeno (B→A) | `400` |
| Cuenta | Eliminación con confirmación `ELIMINAR` | Correcto |
| Cuenta | Eliminación de las cuentas A y B | `204`; login posterior `400` |
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
- **Aislamiento A/B:** se crearon un año activo y una asignatura para cada cuenta. A leyó solo su año (1 fila), no vio el año ni la asignatura de B (0 filas), no pudo modificarlos ni borrarlos (0 filas) y recibió `403/42501` al intentar insertar a nombre de B. Los datos de B quedaron intactos.
- **Storage A/B:** A subió un avatar y un PDF de `academic-files`; pudo firmar y descargar ambos (`200`). B no pudo firmar ni descargar el avatar de A (`400`), no pudo sobrescribirlo (`400`) y no pudo descargar el PDF de A (`400`). Un acceso anónimo al avatar también recibió `400`.
- **Recuperación real:** se solicitó el enlace desde la interfaz y se repitió la solicitud por API para obtener un correo legible; llegó a un buzón temporal, se abrió en Edge, la app mostró “Creá una contraseña nueva”, se guardó la nueva contraseña y apareció “Contraseña actualizada”. El login con la contraseña nueva devolvió `200`; con la anterior, `400`.
- **Alta de B:** como el correo integrado seguía limitado, se desactivó temporalmente “Confirm email”, se creó B con autoconfirmación y se indicó reactivar la opción al terminar. El correo de recuperación de A se envió después y llegó correctamente.

---

## 3. Evidencia de seguridad

| Comprobación | Respuesta |
|---|---|
| `GET /rest/v1/profiles` sin sesión | `200 []` |
| `GET /rest/v1/academic_years` sin sesión | `200 []` |
| `GET /rest/v1/profiles` con sesión | Solo el perfil propio |
| `GET` de un año o asignatura de la otra cuenta | `200 []` |
| `POST /rest/v1/academic_years` con `user_id` aleatorio | `403` / `42501` |
| `PATCH` de un año ajeno | `200`, `0` filas |
| `DELETE` de una asignatura ajena | `200`, `0` filas; sigue existiendo |
| Avatar en bucket público | `400` |
| Avatar autenticado como anónimo | `400` |
| Avatar autenticado como dueño | `200` |
| Firma o descarga del avatar ajeno | `400` |
| `academic-files` del dueño | Subida y descarga `200` |
| `academic-files` ajeno | `400` |
| Avatar después de borrar la cuenta, evitando caché | `404 NoSuchKey` |

La prueba de dos cuentas se completó con 19/19 comprobaciones aprobadas. Cubre lectura cruzada, intentos de escritura, borrado, acceso anónimo y aislamiento de los buckets `avatars` y `academic-files`.

### 3.1. Caché del CDN

Una URL firmada del avatar puede seguir respondiendo desde la caché del CDN después de borrar el objeto. En la prueba, la respuesta cacheada tenía `Cf-Cache-Status: HIT` y `Age` de varios minutos; al pedir el mismo recurso con `Cache-Control: no-cache`, el origen respondió `404 NoSuchKey`. Es una limitación del almacenamiento y de las URLs firmadas, no de la base. Para producción conviene definir una política de caché más corta para archivos privados o aceptar que una URL ya emitida pueda servir el archivo hasta que expire.

---

## 4. Correcciones aplicadas durante la validación

1. **Mensajes de Auth en español:** `getErrorMessage` ahora revisa el código del error antes de devolver el mensaje crudo. El límite de correo se muestra como “Enviaste demasiados correos seguidos. Esperá unos minutos antes de volver a intentar.” Se agregó una prueba unitaria; el total pasó de 51 a 52.
2. **Limpieza de Storage al eliminar la cuenta:** `deleteCurrentAccount` recorre `avatars` y `academic-files` del usuario, borra los archivos y recién después ejecuta `delete_current_user`. Se comprobó el borrado del avatar en el origen.
3. **Correcciones previas de Fase 2:** zonas horarias sin opciones en blanco, encabezado duplicado en tablet, contraste de texto deshabilitado y revisión visual responsive.
4. **Bloqueo del borrado del año activo (D26):** la fila del año activo deshabilita el botón de eliminar, muestra el aviso “Para eliminarlo, activá otro año primero” y `deleteYear` agrega el filtro `is_active=false`. Si la fila desaparece entre la consulta y el borrado, el servicio vuelve a leer el año para distinguir “año activo” de “año inexistente”. Se agregaron tres pruebas unitarias (total: 55) y se verificó en la interfaz real con la cuenta A: el botón quedó deshabilitado y el aviso visible. El borrado real de un año inactivo se había probado antes de D26; después del cambio, el camino de éxito quedó cubierto por la prueba unitaria.

No se modificó el esquema de la base ni las políticas RLS durante esta validación.

---

## 5. Pendientes y riesgos

### Bloqueantes para aprobar la fase

- [x] Aislamiento con dos cuentas confirmadas: 19/19 comprobaciones, incluyendo años, asignaturas, `avatars` y `academic-files`.
- [x] Enlace real de recuperación: correo recibido, contraseña cambiada desde la app y login nuevo `200` / anterior `400`.

### Antes de producción

- [ ] Configurar SMTP propio y plantillas de correo; el servicio integrado de Supabase tiene límites.
- [ ] Reactivar “Confirm email” en Supabase si la validación se hizo con autoconfirmación temporal.
- [ ] Instalar la PWA en un dispositivo real y repetir la revisión visual con datos reales.
- [ ] Compilar y probar Tauri/Windows, Android e iOS; en esta máquina no están disponibles Rust/MSVC, Android Studio ni macOS.
- [ ] Reducir el bundle principal (~966 kB, ~280 kB gzip) con división de código.
- [ ] Revisar los 6 avisos de `npm audit` de la cadena de desarrollo de `vite-plugin-pwa`/`workbox-build`; `npm audit --omit=dev` da 0.
- [ ] Probar `academic-files` con un archivo real de la app; el bucket y el aislamiento ya se probaron con un PDF mínimo (subida/descarga `200`, acceso ajeno `400`).
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

La Fase 2 está funcionalmente completa y las dos pruebas que bloqueaban la aprobación se completaron contra Supabase real: aislamiento entre dos cuentas (19/19) y recuperación por correo con cambio de contraseña. La fase queda a la espera de **aprobación explícita**; este documento no la marca aprobada por sí solo.

No debe declararse “lista para producción” todavía. Antes de publicar faltan SMTP propio, instalación de la PWA en un dispositivo, compilación de Tauri/Android/iOS, división del bundle, revisión de los avisos de desarrollo de `npm audit`, prueba de `academic-files` con un archivo real y medición de índices. Si “Confirm email” quedó desactivado durante la validación, hay que reactivarlo en el panel.

Para reproducir las pruebas:

```powershell
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
npm run dev
```

Las credenciales reales viven en `.env.local`, que está ignorado por Git. No se guardaron claves `service_role`, secretas ni contraseñas de usuarios reales en el repositorio ni en la documentación.
