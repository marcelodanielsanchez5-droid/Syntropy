# Syntropy — Mapa de navegación

**Fase:** 1 — Diseño  
**Estado:** propuesta para aprobación

---

## 1. Principios de navegación

1. **Inicio es el centro de organización.** Desde allí se ve el resumen, las funciones generales y las asignaturas.
2. **La asignatura es un espacio con su propio contexto.** Al entrar, el calendario es la primera vista.
3. **Las funciones generales no obligan a entrar materia por materia.**
4. **El panel de tareas es persistente en escritorio.** En móvil se convierte en hoja desplegable y pestaña.
5. **No hay menús ocultos para funciones principales.** Calendario, Horario, Calificaciones, Nodos y Biblioteca son accesibles desde la navegación principal.
6. **El año de curso es un contexto visible.** El usuario debe saber en qué año está trabajando.
7. **La navegación móvil es propia.** Barra inferior + hojas desplegables; no es la barra lateral comprimida.

---

## 2. Árbol de rutas

```text
/
├─ /ingresar
├─ /crear-cuenta
├─ /recuperar-contrasena
├─ /restablecer-contrasena
│
└─ (rutas privadas, dentro de AppLayout)
   ├─ /inicio
   ├─ /calendario                    Calendario general
   ├─ /horario                       Horario general
   ├─ /calificaciones                Tabla general de notas
   ├─ /nodos                         Plano del año de curso
   ├─ /biblioteca                    Biblioteca general
   ├─ /perfil
   ├─ /configuracion
   │
   └─ /asignaturas
      ├─ /nueva
      └─ /:id
         ├─ /calendario              Vista inicial de la asignatura
         ├─ /nodos                   Árbol de la asignatura
         ├─ /calificaciones          Notas de la asignatura
         ├─ /biblioteca              Fuentes de la asignatura
         ├─ /informacion             Docentes, metodología, criterios
         └─ /editar
```

### 2.1. Rutas por fase

| Ruta | Fase | Estado |
|---|---|---|
| `/ingresar`, `/crear-cuenta`, `/recuperar-contrasena` | 2 | MVP |
| `/inicio`, `/asignaturas/nueva`, `/asignaturas/:id/editar` | 2 | MVP |
| `/calendario`, `/asignaturas/:id/calendario` | 3 | MVP |
| `/horario`, `/calificaciones` | 4 | MVP |
| `/nodos`, `/asignaturas/:id/nodos` | 5 | Posterior |
| `/biblioteca`, `/asignaturas/:id/biblioteca` | 6 | Posterior |
| `/perfil`, `/configuracion` | 2 | MVP |
| `/asignaturas/:id/informacion` | 2 | MVP |

Las rutas de fases posteriores pueden existir en el router con una pantalla “Próximamente”, pero no deben mostrarse como si ya funcionaran. Se recomienda mostrar el ícono deshabilitado con etiqueta “Próximamente” hasta su fase.

---

## 3. Estructura de escritorio

### 3.1. Pantallas grandes (≥ 1280 px)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  [logo]  Inicio                         [campana]      [avatar] [usuario]    │  64 px
├──────────┬───────────────────────────────────────────────┬───────────────────┤
│          │                                               │                   │
│  Inicio  │                                               │   Panel derecho   │
│  Calend. │              Contenido principal              │   contextual      │
│  Horario │                                               │   (tareas,        │
│  Notas   │                                               │    info, filtros) │
│  Nodos   │                                               │                   │
│  Biblio. │                                               │                   │
│          │                                               │                   │
│  Config. │                                               │                   │
│          │                                               │                   │
├──────────┴───────────────────────────────────────────────┴───────────────────┤
│                           barra inferior de estado (opcional)                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Barra lateral: 84 px colapsada a iconos, 240 px expandida.
- El ítem activo tiene una barra vertical rosa y un fondo sutil.
- Panel derecho: 360 px en calendario y tareas; 320 px en información de asignatura.
- Contenido central: ancho fluido, con padding de 24–32 px.
- Barra superior: 64 px, fija.
- El selector de año de curso vive en la parte superior de la barra lateral, debajo del logo.

### 3.2. Pantallas medianas (1024–1279 px)

- Barra lateral solo con iconos (84 px).
- El panel derecho se convierte en panel desplegable superpuesto.
- El calendario reduce el ancho de columnas, pero conserva los siete días.
- Se prioriza el contenido central.

### 3.3. Tablets (768–1023 px)

- Sin barra lateral permanente; se usa un menú lateral desplegable.
- El panel de tareas pasa a una pestaña o cajón inferior.
- El calendario puede alternar entre mes y agenda.

### 3.4. Ventana de Windows

- Tamaño inicial: 1440 × 900.
- Tamaño mínimo: 1024 × 700.
- Se permite redimensionar.
- Atajos de teclado:
  - `G` luego `I`: Inicio
  - `G` luego `C`: Calendario
  - `N`: nueva tarea
  - `Esc`: cerrar diálogo
  - `Ctrl/Cmd + K`: búsqueda rápida (opcional, posterior)

---

## 4. Estructura móvil

### 4.1. Navegación inferior

Cinco destinos:

1. **Inicio**
2. **Calendario**
3. **Horario**
4. **Calificaciones**
5. **Más**

“Más” abre una hoja con:

- Nodos de conocimiento (cuando exista)
- Biblioteca (cuando exista)
- Año de curso
- Perfil
- Configuración
- Ayuda
- Cerrar sesión

```text
┌─────────────────────────────┐
│  [logo]   Inicio      [avatar] │
│                               │
│   Contenido con scroll        │
│                               │
│                               │
│                     [ + ]     │
├─────────────────────────────┤
│ Inicio  Calend.  Horario  Notas  Más │
└─────────────────────────────┘
```

- Barra inferior de 64 px + área segura.
- Cada destino tiene ícono y etiqueta.
- El botón flotante “+” cambia según la pantalla:
  - Inicio: nueva asignatura.
  - Calendario: nueva tarea.
  - Horario: nuevo bloque.
  - Calificaciones: nueva evaluación.
  - Nodos: nuevo tema.
- Si hay un teclado abierto, la barra inferior se oculta.
- El botón Atrás de Android vuelve a la pantalla anterior; si está en Inicio, sale de la app.

### 4.2. Navegación dentro de una asignatura

La barra superior muestra:

- flecha de regreso;
- nombre y color de la asignatura;
- menú de tres puntos (editar, eliminar, información).

Debajo, una fila horizontal desplazable:

```text
[ Calendario ] [ Nodos ] [ Calificaciones ] [ Biblioteca ] [ Información ]
```

- La pestaña activa tiene subrayado rosa.
- No se muestran todas las pestañas si la asignatura aún no tiene módulos habilitados; se puede indicar “Próximamente”.
- El panel de tareas se abre con el botón “Tareas” o el FAB.

### 4.3. Panel de tareas en móvil

- En el calendario general: botón “Tareas” en la barra superior; abre una hoja a pantalla completa.
- En el calendario de asignatura: pestaña “Tareas” dentro de la vista o botón flotante.
- La hoja tiene un asa superior, filtros por estado y lista desplazable.
- Al tocar una tarea se abre un detalle en hoja, con acciones editar, eliminar y cambiar estado.
- No se usa un panel lateral permanente: no cabe y compite con el calendario.

---

## 5. Pantallas y contenidos

| Pantalla | Ruta | Contenido principal | Panel derecho / móvil | Fase |
|---|---|---|---|---|
| Ingresar | `/ingresar` | correo, contraseña, recuperar, crear cuenta | — | 2 |
| Crear cuenta | `/crear-cuenta` | usuario, correo, contraseña, términos | — | 2 |
| Recuperar | `/recuperar-contrasena` | correo, instrucciones | — | 2 |
| Restablecer | `/restablecer-contrasena` | nueva contraseña | — | 2 |
| Inicio | `/inicio` | saludo, funciones generales, asignaturas, año activo | resumen “Hoy” | 2 |
| Nueva asignatura | `/asignaturas/nueva` | formulario y vista previa | vista previa en escritorio | 2 |
| Editar asignatura | `/asignaturas/:id/editar` | mismo formulario con datos | vista previa | 2 |
| Calendario general | `/calendario` | mes/semana/agenda, filtros | panel de tareas | 3 |
| Calendario de asignatura | `/asignaturas/:id/calendario` | calendario con color propio | panel de tareas | 3 |
| Detalle de tarea | modal u hoja | título, descripción, fechas, estado, nodo | — | 3 |
| Detalle de examen | modal u hoja | fecha, plan de estudio, nodo | — | 3 |
| Plan de estudio | modal | días antes, frecuencia, duración, hora | — | 3 |
| Horario | `/horario` | grilla semanal, materias del día | detalle del bloque | 4 |
| Calificaciones | `/calificaciones` | tabla, escala, promedio, proyección | resumen de materia | 4 |
| Nodos generales | `/nodos` | plano del año, filtros, leyenda | información de asignatura | 5 |
| Nodos de asignatura | `/asignaturas/:id/nodos` | árbol, conexiones, detalle | panel de nodo | 5 |
| Biblioteca | `/biblioteca` | filtros, búsqueda, tarjetas | detalle de fuente | 6 |
| Información de asignatura | `/asignaturas/:id/informacion` | docentes, horario, metodología, criterios | acciones | 2 |
| Perfil | `/perfil` | datos personales, avatar, contraseña | — | 2 |
| Configuración | `/configuracion` | preferencias, escala, correo, cuenta | — | 2/4 |

---

## 6. Flujos principales

### 6.1. Primer ingreso

```text
Ingresar → elegir año de curso (o crear uno) → Inicio
Inicio → “Agregar asignatura” → formulario → guardar → Inicio
Inicio → abrir asignatura → Calendario de la asignatura
```

### 6.2. Crear una tarea

```text
Calendario general o de asignatura
  → botón “Nueva tarea” / FAB
  → formulario: nombre, descripción, asignatura, fecha límite, estado, color
  → guardar
  → aparece en calendario y panel de tareas
```

### 6.3. Crear un examen con plan de estudio

```text
Calendario de asignatura
  → “Nuevo examen”
  → fecha, hora, duración
  → activar “Plan de estudio”
  → días antes, frecuencia, duración de sesión, hora preferida
  → guardar
  → se generan las sesiones y se muestran en el calendario individual
```

### 6.4. Registrar una nota y ver la proyección

```text
Calificaciones
  → seleccionar asignatura
  → “Nueva evaluación”
  → nombre, fecha, nota, escala, peso
  → guardar
  → promedio actualizado
  → tarjeta “¿Qué nota necesito?”
```

### 6.5. Consultar el día

```text
Inicio → resumen “Hoy”
  → materias del día (horario)
  → tareas que vencen hoy
  → exámenes próximos
  → acceso directo a cada elemento
```

### 6.6. Navegar los nodos

```text
Nodos generales
  → filtrar por asignatura o año
  → hacer zoom y paneo
  → tocar un nodo
  → panel con nombre, descripción, dificultad, dominio, resumen, notas y fuentes
  → “Abrir asignatura” o “Editar tema”
```

---

## 7. Estados de navegación

### 7.1. Sin sesión

- Cualquier ruta privada redirige a `/ingresar`.
- Después del login se vuelve a la ruta solicitada.

### 7.2. Sesión sin año de curso

- Se muestra un paso de bienvenida para crear el primer año.
- No se permite crear asignaturas hasta tener un año activo.

### 7.3. Sin asignaturas

- Inicio muestra un estado vacío con ilustración de carpetas y botón “Agregar asignatura”.
- Se explica qué es una asignatura y para qué sirve.

### 7.4. Sin conexión

- Se muestra una banda superior “Sin conexión · datos guardados”.
- Se pueden consultar datos cacheados.
- Las acciones de escritura se deshabilitan con tooltip “Necesitas conexión para guardar”.
- Al volver la conexión se refrescan las consultas.

### 7.5. Error

- Si falla una carga, se muestra un mensaje claro, un botón “Reintentar” y un enlace a ayuda.
- Nunca se muestra un error técnico crudo.

### 7.6. Cargando

- Esqueletos con la forma del contenido.
- No se usa un spinner de pantalla completa salvo en el arranque.

---

## 8. Reglas de navegación y permisos

- Un usuario solo ve sus años, asignaturas, tareas, notas, nodos y fuentes.
- Los enlaces directos a datos de otra cuenta devuelven “No encontrado”, no “No autorizado”, para no revelar existencia.
- El panel de tareas siempre respeta el filtro de asignatura de la pantalla actual.
- El calendario general muestra tareas y exámenes de todas las asignaturas del año activo.
- El calendario de asignatura muestra solo esa asignatura, pero puede incluir sesiones de estudio.
- Al cambiar de año de curso se recargan los datos y se conserva la pantalla cuando sea posible.

---

## 9. Navegación visual

La presentación `presentacion.html` incluye:

- mapa de navegación en columnas;
- wireframes de escritorio;
- wireframes móviles;
- estructura del panel de tareas;
- selector de año de curso.

---

## 10. Decisiones pendientes relacionadas

- **D2:** semántica del año de curso.
- **D6:** contenido de la campana.
- **D8:** consentimiento de menores.
- **D11:** borrado de asignaturas.
- **D12:** nombre e identidad de la app en tiendas.
