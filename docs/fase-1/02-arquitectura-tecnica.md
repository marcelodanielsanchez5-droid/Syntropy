# Syntropy — Arquitectura técnica

**Fase:** 1 — Diseño  
**Estado:** propuesta para aprobación  
**Última actualización:** 10 de noviembre de 2026

---

## 1. Principio rector

Syntropy se construye **una sola vez** como aplicación React + TypeScript y se distribuye en cuatro destinos:

```text
                         ┌─────────────────────────────┐
                         │   Código fuente compartido  │
                         │  React + TypeScript + Vite  │
                         │  Tailwind + React Router    │
                         │  Supabase JS + React Query  │
                         └──────────────┬──────────────┘
                                        │ mismo build web
          ┌─────────────────────────────┼─────────────────────────────┐
          │                             │                             │
   ┌──────▼──────┐              ┌───────▼───────┐             ┌───────▼───────┐
   │     Web     │              │    Windows    │             │ Android / iOS │
   │ PWA instalable│            │ Tauri 2       │             │ Capacitor     │
   │ Navegador   │              │ WebView2      │             │ WebView nativa│
   └──────┬──────┘              └───────┬───────┘             └───────┬───────┘
          └─────────────────────────────┼─────────────────────────────┘
                                        │ HTTPS
                         ┌──────────────▼──────────────┐
                         │           Supabase          │
                         │ Auth · PostgreSQL · Storage │
                         │ Row Level Security          │
                         └──────────────┬──────────────┘
                                        │ solo servidor
                         ┌──────────────▼──────────────┐
                         │  Edge Function de recordatorios │
                         │  + Resend (Fase 7)          │
                         └─────────────────────────────┘
```

No hay tres aplicaciones. Hay **un frontend** y tres empaquetados. Las diferencias por plataforma se limitan a:

- tamaño y navegación de pantalla;
- integración con teclado, ratón o táctil;
- instalación y actualización;
- permisos nativos, si alguna vez hacen falta.

---

## 2. Stack propuesto

### 2.1. Núcleo

| Área | Tecnología | Versión propuesta | Motivo |
|---|---|---|---|
| Entorno de ejecución | Node.js LTS | 24.22.2 | LTS, compatible con Vite 8 y Capacitor 8 |
| UI | React | 19.3.1 | Estable, componentes y ecosistema maduro |
| Lenguaje | TypeScript | 5.9.3 | Tipado fuerte; se evita TS 7 recién publicado |
| Build | Vite | 8.3.7 | Rápido, estándar para React |
| Plugin React | `@vitejs/plugin-react` | 6.3.0 | Compatible con Vite 8 |
| Estilos | Tailwind CSS | 4.3.5 | Tokens y utilidades; configuración CSS-first |
| Plugin Tailwind | `@tailwindcss/vite` | 4.3.5 | Integración oficial con Vite |
| Rutas | React Router | 7.18.5 | Estable; se evita la línea 8 recién publicada |
| Estado del servidor | TanStack Query | 5.107.1 | Caché, reintentos, estados de carga y persistencia |
| Formularios | React Hook Form | 7.91.0 | Formularios controlados y validación |
| Validación | Zod | 4.6.7 | Esquemas compartidos cliente/servidor |
| Fechas | date-fns | 4.4.0 | Fechas, diferencias, zonas horarias y locale español |
| Iconos | Lucide React | 1.71.0 | Iconos de línea coherentes con la referencia |
| Utilidades CSS | clsx + tailwind-merge | 2.1.1 / 3.7.0 | Composición de clases sin conflictos |
| Primitivas accesibles | Radix UI | últimas estables | Diálogos, menús, popovers y tooltips accesibles |
| Avisos | Sonner | 2.0.8 | Toasts no bloqueantes |

### 2.2. Backend y servicios

| Área | Tecnología | Versión / plan |
|---|---|---|
| Autenticación | Supabase Auth | Servicio gestionado |
| Base de datos | PostgreSQL en Supabase | Servicio gestionado |
| Cliente | `@supabase/supabase-js` | 2.119.0 |
| Archivos | Supabase Storage | Buckets privados |
| Seguridad | Row Level Security (RLS) | Obligatoria en todas las tablas |
| Correo | Resend + Supabase Edge Functions | Fase 7 |
| Web | Vercel (recomendado) | Plan gratuito para el MVP |

### 2.3. Librerías especializadas

| Área | Tecnología | Versión propuesta | Nota |
|---|---|---|---|
| Calendario | FullCalendar | 6.1.22 | La línea 7 está cambiando de paquetes; 6.1.x es estable y compatible con React 19 |
| Nodos | React Flow (`@xyflow/react`) | 12.12.1 | Zoom, paneo, conexiones y nodos personalizados |
| PWA | `vite-plugin-pwa` | 2.0.0 | Service worker, manifiesto y caché de interfaz |
| Escritorio | Tauri | 2.12.4 | Instalador Windows, WebView2 |
| Móvil | Capacitor | 8.6.0 | Android e iOS desde el mismo build |

### 2.4. Calidad

| Área | Tecnología |
|---|---|
| Pruebas unitarias | Vitest 5.1.0 |
| Componentes | Testing Library 16.3.3 |
| Extremo a extremo | Playwright 1.65.0 |
| Formato y lint | ESLint + Prettier |
| Integración continua | GitHub Actions |
| Tipos de base de datos | Generación con Supabase CLI |

> Las versiones se fijarán en `package-lock.json`. Antes de instalar se comprobará compatibilidad; no se actualizará una librería mayor sin una prueba de regresión.

---

## 3. Estructura del repositorio

```text
Syntropy/
├─ docs/
│  ├─ fase-1/                 # esta documentación
│  └─ assets/                 # logo, tipografía, recursos de marca
├─ public/
│  ├─ icons/                  # íconos PWA
│  └─ manifest.webmanifest
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ router.tsx
│  │  ├─ providers.tsx
│  │  └─ layouts/
│  │     ├─ AuthLayout.tsx
│  │     └─ AppLayout.tsx
│  ├─ components/
│  │  ├─ ui/                  # Button, Input, Dialog, Card, Badge...
│  │  ├─ layout/              # TopBar, Sidebar, BottomNav, PageHeader
│  │  └─ feedback/            # EmptyState, ErrorState, Skeletons
│  ├─ features/
│  │  ├─ auth/
│  │  ├─ profile/
│  │  ├─ academic-years/
│  │  ├─ subjects/
│  │  ├─ calendar/
│  │  ├─ tasks/
│  │  ├─ exams/
│  │  ├─ schedule/
│  │  ├─ grades/
│  │  ├─ nodes/
│  │  └─ library/
│  ├─ lib/
│  │  ├─ supabase.ts
│  │  ├─ query-client.ts
│  │  ├─ dates.ts
│  │  ├─ colors.ts
│  │  ├─ errors.ts
│  │  └─ env.ts
│  ├─ hooks/                  # hooks transversales
│  ├─ types/
│  ├─ styles/
│  │  ├─ globals.css
│  │  └─ tokens.css
│  └─ main.tsx
├─ src-tauri/                 # se agrega al habilitar Windows
├─ android/                   # se agrega con Capacitor
├─ ios/                       # se agrega con Capacitor
├─ supabase/
│  ├─ migrations/
│  └─ functions/
│     └─ send-reminders/      # Fase 7
├─ tests/
│  ├─ unit/
│  └─ e2e/
├─ .env.example
├─ package.json
├─ vite.config.ts
├─ capacitor.config.ts
├─ tailwind (configuración CSS)
└─ README.md
```

Cada `feature` agrupa sus componentes, páginas, hooks, servicios, esquemas y tipos. Esto evita un `components/` gigante y permite borrar o ampliar un módulo sin tocar los demás.

### 3.1. Regla de dependencias

```text
pages / components  →  hooks  →  services  →  Supabase
                         ↓
                    lógica pura (lib, utils)
```

- Un componente no llama a Supabase directamente.
- Un servicio no conoce componentes.
- La lógica de negocio (notas, planes, colores) vive en funciones puras y se prueba sin navegador.

---

## 4. Rutas y capas de la aplicación

### 4.1. Público

- `/ingresar`
- `/crear-cuenta`
- `/recuperar-contrasena`
- `/restablecer-contrasena`

### 4.2. Privado

- `/inicio`
- `/calendario`
- `/horario`
- `/calificaciones`
- `/nodos`
- `/biblioteca`
- `/perfil`
- `/configuracion`
- `/asignaturas/nueva`
- `/asignaturas/:id/calendario`
- `/asignaturas/:id/nodos`
- `/asignaturas/:id/calificaciones`
- `/asignaturas/:id/biblioteca`
- `/asignaturas/:id/informacion`
- `/asignaturas/:id/editar`

Las rutas privadas se protegen con un `ProtectedRoute` que escucha la sesión de Supabase. Mientras se resuelve la sesión se muestra una pantalla de carga, no un salto a login.

### 4.3. Idiomas y formatos

- `Intl.DateTimeFormat('es')` y locale de FullCalendar en español.
- Semana de lunes a domingo (`firstDay: 1`).
- Zona horaria del perfil, detectada del navegador en el registro y editable.
- Fechas y horas se guardan en UTC (`timestamptz`); se muestran en la zona del usuario.
- Horario semanal se guarda como hora local + día, porque una clase de las 08:00 sigue siendo a las 08:00 aunque cambie el horario de verano.

---

## 5. Gestión de datos y estado

### 5.1. Separación

| Tipo de estado | Herramienta | Ejemplo |
|---|---|---|
| Sesión | Contexto de autenticación | usuario actual, perfil |
| Datos remotos | TanStack Query | asignaturas, tareas, notas |
| Formularios | React Hook Form + Zod | crear asignatura |
| UI local | `useState` / `useReducer` | panel abierto, filtro elegido |
| Preferencias | `user_settings` + caché local | tema, zona horaria |

No se usa Redux. No hace falta para este alcance.

### 5.2. Consultas

- Cada consulta tiene una `queryKey` que incluye el `user_id`, para que la caché no se mezcle entre cuentas.
- Las mutaciones invalidan las consultas afectadas.
- Los errores de red se reintentan con retroceso exponencial, salvo errores de validación o permisos.
- Las operaciones de creación muestran un estado de envío y evitan dobles clics.

### 5.3. Caché offline

El documento maestro pide PWA instalable y consulta de datos ya cargados sin conexión. La estrategia es:

1. El service worker guarda la interfaz (HTML, JS, CSS, fuentes e íconos).
2. TanStack Query persiste en IndexedDB una copia de las consultas exitosas.
3. La copia se separa por `user_id`.
4. Se borra al cerrar sesión.
5. Caduca a las 24 horas.
6. Nunca se cachean respuestas autenticadas de Supabase en el service worker.
7. Sin conexión se muestra un aviso y se deshabilitan las acciones de escritura.

**Limitación:** IndexedDB no está cifrado por el sistema operativo. En un dispositivo compartido, otra persona con acceso al navegador podría inspeccionar la caché. Por eso se limpia al cerrar sesión y se documenta como riesgo. Una versión futura puede añadir bloqueo por PIN o cifrado local.

---

## 6. Autenticación

### 6.1. Flujo

1. El usuario se registra con nombre de usuario, correo y contraseña.
2. Supabase envía un correo de confirmación.
3. Al confirmar, se crea el perfil y la configuración inicial mediante un trigger.
4. El usuario inicia sesión con correo y contraseña.
5. La sesión se refresca automáticamente.
6. Al cerrar sesión se limpia la caché local y se redirige a `/ingresar`.

### 6.2. Confirmación y recuperación en apps empaquetadas

Los enlaces de confirmación y recuperación abren una URL. En web es directo. En Tauri y Capacitor se necesita una URL de retorno:

- **Opción MVP:** el correo abre la **web**; allí se confirma o restablece la contraseña. Luego el usuario vuelve a la app e inicia sesión.
- **Opción posterior:** esquema propio `syntropy://auth/callback` con configuración de enlaces profundos en Android, iOS y Tauri.

Se recomienda la opción MVP: es más simple, funciona en las tres plataformas y evita configurar asociaciones de dominio antes de tenerlas.

### 6.3. Seguridad

- La `anon key` de Supabase es pública por diseño; la protección real es RLS.
- La `service_role` **nunca** se incluye en el frontend. Solo se usa en Edge Functions.
- Las contraseñas se validan con mínimo 8 caracteres, mayúscula, minúscula y número; Supabase aplica su propia política.
- No se registran correos ni datos académicos en logs.
- Los enlaces de recuperación caducan según la configuración de Supabase.

---

## 7. Backend Supabase

### 7.1. Esquema

El detalle está en `06-modelo-datos.md` y en `supabase/migrations/001_schema_inicial.sql`.

Tablas principales:

- `profiles`
- `user_settings`
- `grading_settings`
- `academic_years`
- `subjects`
- `schedule_entries`
- `tasks`
- `exams`
- `study_sessions`
- `assessments`
- `nodes`
- `node_links`
- `sources`
- `reminders`

### 7.2. RLS

Todas las tablas tienen RLS habilitado. La regla base es:

```sql
using (user_id = auth.uid())
with check (user_id = auth.uid())
```

Además, las relaciones usan claves compuestas con `user_id` para impedir que una fila propia apunte a datos de otra cuenta. No basta con una política por tabla padre: también hay que proteger las claves foráneas.

### 7.3. Storage

Dos buckets privados:

| Bucket | Contenido | Ruta |
|---|---|---|
| `academic-files` | documentos, imágenes, audios y miniaturas de la biblioteca | `{user_id}/{source_id}/archivo` |
| `avatars` | foto de perfil | `{user_id}/avatar.webp` |

Las políticas comprueban que la primera carpeta de la ruta sea el `auth.uid()`. La descarga se hace con URL firmada de corta duración.

### 7.4. Funciones y triggers

- `handle_new_user()`: crea perfil, preferencias y configuración de notas al registrarse.
- `set_updated_at()`: actualiza `updated_at` en cada modificación.
- Validación de que un enlace de nodos une dos nodos del mismo usuario.
- Validación de que un nodo padre pertenece a la misma asignatura.

### 7.5. Límites y rendimiento

- Índices por `user_id`, fecha límite, estado y asignatura.
- Paginación en biblioteca y listados grandes.
- Consultas del calendario acotadas por rango visible (mes o semana), no “todas las tareas históricas”.
- Las notas y los nodos se cargan bajo demanda.
- Supabase Free tiene límites de filas, almacenamiento y ancho de banda; se documentarán antes de lanzar.

---

## 8. Recordatorios con Resend (Fase 7)

Resend nunca se llama desde el navegador. El flujo será:

```text
Base de datos (reminders)
        │
        │ pg_cron cada 5 minutos
        ▼
Edge Function send-reminders
        │  lee recordatorios pendientes
        │  verifica preferencias del usuario
        ▼
Resend API  →  correo al estudiante
        │
        ▼
Actualiza estado: enviado / fallido
```

- `RESEND_API_KEY` y el remitente viven como secretos de Supabase.
- La Edge Function se ejecuta con `service_role`, pero solo devuelve datos del recordatorio que procesa.
- Se registra el identificador de Resend para auditoría.
- No se lee la bandeja del usuario.
- Los recordatorios se pueden cancelar o reprogramar.
- Se respeta la zona horaria del usuario.

---

## 9. Empaquetado multiplataforma

### 9.1. Web / PWA

- Build estático en `dist/`.
- `manifest.webmanifest` con nombre, colores, íconos y modo `standalone`.
- Service worker con precache de la interfaz.
- Actualización con aviso “Hay una nueva versión disponible”.
- Hosting recomendado: Vercel, con dominio propio cuando exista.

### 9.2. Windows / Tauri 2

- Tauri apunta al mismo `dist/`.
- Ventana inicial 1440 × 900, mínimo 1024 × 700.
- Barra de título nativa; no se implementa una barra personalizada en el MVP.
- Instalador NSIS `.exe` y/o MSI.
- Requiere WebView2 (incluido en Windows 10/11 actualizados).
- Requiere Rust, Cargo y Visual Studio Build Tools con MSVC.
- El instalador sin firma puede mostrar advertencia de SmartScreen. La firma de código es opcional y tiene costo.

### 9.3. Android / Capacitor

- `npx cap add android`.
- WebView usa el build de Vite.
- Requiere Android Studio, SDK y JDK 21 (la versión instalada actualmente es Java 8, incompatible).
- Se genera `.aab` firmado para Google Play.
- Se prueban tamaños de 360 px, 412 px y tablets.
- Se respeta el área segura (notch) y el botón Atrás.

### 9.4. iOS / Capacitor

- `npx cap add ios`.
- Requiere macOS, Xcode y una cuenta de Apple Developer.
- En Windows se puede desarrollar la interfaz y validar en navegador, pero **no compilar** la app iOS.
- Alternativas: Mac propia, Mac en la nube o CI con runner macOS.
- Se recomienda cerrar Android y Windows antes de invertir en iOS.

### 9.5. Identificadores

Propuesta, pendiente de confirmación:

- Nombre: `Syntropy`
- Bundle ID: `com.syntropy.app`
- Esquema profundo futuro: `syntropy://`
- Versión inicial: `0.1.0`

---

## 10. Seguridad y privacidad

### 10.1. Controles

- RLS en todas las tablas.
- Claves compuestas por usuario en relaciones.
- Validación Zod en cliente y restricciones `check` en base de datos.
- Buckets privados y URLs firmadas.
- HTTPS obligatorio.
- CSP en producción.
- Dependencias auditadas con `npm audit`.
- Sin secretos en el repositorio.
- `.env.local` ignorado por Git.

### 10.2. Menores

- Edad mínima 13 años.
- Aceptación de términos y privacidad en el registro.
- No se solicita fecha de nacimiento.
- El nombre de usuario y el correo no se muestran públicamente.
- No hay funciones sociales.
- Se debe poder eliminar la cuenta y los datos.
- Antes de publicar se requiere revisión legal de la política de privacidad.

### 10.3. Variables de entorno

```dotenv
# Públicas del frontend (seguras mientras RLS esté bien configurado)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_APP_URL=http://localhost:5173
VITE_APP_ENV=development

# Secretos: NO van en el frontend ni en Vite.
# Se configuran en Supabase Edge Functions (Fase 7).
# RESEND_API_KEY=re_...
# REMINDER_FROM_EMAIL=recordatorios@tudominio.com
```

Se incluye [`.env.example`](../../.env.example) en la raíz, sin valores reales.

---

## 11. Pruebas

### 11.1. Unitarias obligatorias

- Cálculo de promedio ponderado con distintas escalas.
- Nota necesaria para aprobar, incluyendo casos imposibles.
- Porcentaje de nota y contorno de nodo.
- Forma del nodo según dificultad.
- Generación de sesiones de estudio.
- Fechas: semana que empieza en lunes, zonas horarias, cambio de mes.
- Cuenta regresiva y estados “Hoy”, “Mañana”, “Atrasada”.
- Validaciones de formularios.

### 11.2. Componentes

- Formulario de asignatura.
- Panel de tareas y filtros.
- Calendario en escritorio y móvil.
- Tabla de notas.
- Nodo con forma, intensidad y contorno.

### 11.3. Extremo a extremo

1. Registro y confirmación.
2. Inicio de sesión y cierre.
3. Crear, editar y eliminar asignatura.
4. Crear tarea y verla en calendario.
5. Crear examen y generar plan de estudio.
6. Registrar notas y ver proyección.
7. Aislamiento entre dos usuarios.

### 11.4. Matriz manual

| Plataforma | Navegador / dispositivo | Qué se prueba |
|---|---|---|
| Web | Chrome, Edge, Firefox | PWA, responsive, teclado |
| Windows | Instalador Tauri | ventana, menús, actualización |
| Android | Teléfono y tablet | táctil, Atrás, teclado, safe area |
| iOS | iPhone y iPad | táctil, safe area, enlaces |

---

## 12. Despliegue e integración continua

### 12.1. Flujo recomendado

```text
main
 ├─ lint + typecheck + tests unitarios
 ├─ build web
 ├─ deploy PWA (Vercel)
 ├─ build Windows (GitHub Actions windows-latest)
 ├─ build Android (ubuntu + Android SDK)
 └─ build iOS (macOS runner, solo cuando se habilite)
```

### 12.2. Entornos

| Entorno | Supabase | Web | Uso |
|---|---|---|---|
| Desarrollo | Proyecto de desarrollo | localhost | pruebas diarias |
| Producción | Proyecto de producción | dominio | usuarios reales |

No se usa el proyecto de producción para pruebas destructivas.

### 12.3. Cuentas y costos

| Servicio | Necesidad | Costo inicial |
|---|---|---|
| GitHub | Repositorio y CI | Gratis |
| Supabase | Auth, base y storage | Plan gratuito; límites |
| Vercel | Web/PWA | Plan gratuito |
| Resend | Correos (Fase 7) | Plan gratuito; límites |
| Apple Developer | Publicar iOS | Pago anual |
| Google Play | Publicar Android | Pago único |
| Firma Windows | Evitar SmartScreen | Opcional, con costo |

---

## 13. Entorno actual y preparación de la Fase 2

### 13.1. Estado comprobado

En la máquina actual:

| Herramienta | Estado |
|---|---|
| Node.js / npm | No instalado |
| Git | No instalado |
| Rust / Cargo | No instalado |
| Docker | No instalado |
| Supabase CLI | No instalado |
| Java | Instalado, pero versión 8 (insuficiente para Android moderno) |
| Python | No disponible |
| Winget | Disponible |

No se puede ejecutar ni compilar la aplicación todavía. La Fase 1 es documental y visual, por lo que no se bloquea.

### 13.2. Instalación mínima para empezar la Fase 2

1. Node.js 24 LTS.
2. Git.
3. Visual Studio Code.
4. Cuenta de GitHub.
5. Cuenta de Supabase.
6. Supabase CLI mediante `npx supabase`.
7. Navegador Chrome o Edge.

Rust, Android Studio y Xcode se instalan cuando corresponda a cada empaquetado, no antes de que la aplicación web funcione.

---

## 14. Decisiones de arquitectura registradas

| ID | Decisión | Estado |
|---|---|---|
| ADR-001 | Una sola base de código React + TypeScript | Aprobada por el documento |
| ADR-002 | Supabase para Auth, PostgreSQL y Storage | Aprobada por el documento |
| ADR-003 | RLS y claves compuestas por usuario | Propuesta |
| ADR-004 | TanStack Query para estado remoto y caché | Propuesta |
| ADR-005 | FullCalendar 6.1.x en lugar de 7.x | Propuesta técnica |
| ADR-006 | PWA + Tauri para Windows | Pendiente de aprobación |
| ADR-007 | Caché offline por usuario en IndexedDB | Pendiente de aprobación |
| ADR-008 | Enlaces de correo abren la web en el MVP | Propuesta |
| ADR-009 | Resend solo desde Edge Function | Aprobada por seguridad |
| ADR-010 | Tema oscuro único en el MVP | Pendiente de aprobación |

---

## 15. Qué no se decide todavía

- El proveedor definitivo de hosting.
- La firma de código de Windows.
- El dominio y correo profesional.
- El sistema legal de consentimiento para menores.
- La política de retención de datos.
- La versión exacta de Xcode y Android SDK.
- El diseño final del logo (la versión actual es provisional).

Estos puntos no bloquean la Fase 1, pero deben resolverse antes de la publicación.
