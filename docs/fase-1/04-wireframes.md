# Syntropy — Wireframes

**Fase:** 1 — Diseño  
**Estado:** propuesta para aprobación  
**Vista visual:** [`presentacion.html`](./presentacion.html)

---

## 1. Cómo leer los wireframes

Los wireframes son **maquetas no funcionales**. Muestran jerarquía, contenido, navegación y adaptación. No representan todavía la implementación final ni datos reales.

Se diseñaron dos experiencias:

- **Escritorio / Windows:** barra superior, barra lateral, contenido central y panel derecho.
- **Móvil:** barra superior compacta, contenido vertical, navegación inferior y hojas desplegables.

Los colores, tipografía y componentes se definen en `05-sistema-diseno.md`.

---

## 2. Pantallas de escritorio

### 2.1. Ingresar

**Objetivo:** entrar con correo y contraseña sin distracciones.

```text
┌───────────────────────────────┬──────────────────────────────────────────────┐
│                               │                                              │
│   [logo]                      │   ┌──────────────────────────────────────┐   │
│   Syntropy                    │   │  Ingresar                            │   │
│                               │   │                                      │   │
│   Tu espacio académico,       │   │  Correo electrónico                  │   │
│   conectado.                  │   │  [________________________________]  │   │
│                               │   │                                      │   │
│   [decoración de circuitos]   │   │  Contraseña                          │   │
│                               │   │  [________________________________]  │   │
│                               │   │                                      │   │
│                               │   │  [ Acceder ]                         │   │
│                               │   │                                      │   │
│                               │   │  ¿Olvidaste tu contraseña?           │   │
│                               │   │  ¿No tienes cuenta? Crear cuenta     │   │
│                               │   └──────────────────────────────────────┘   │
│                               │                                              │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

**Elementos:**

- Fondo oscuro con grilla tenue y una franja diagonal rosa-morado.
- Marca a la izquierda, formulario a la derecha.
- Campos con etiqueta persistente, no solo placeholder.
- Botón principal rosa.
- Enlace de recuperación y de registro.
- Mensajes de error bajo el campo correspondiente.
- Estado de carga del botón: “Ingresando…”.
- Sin avatar falso en el formulario: la referencia lo tenía como decoración, pero no aporta información.

**Móvil:** una sola columna; marca compacta arriba, formulario ancho completo, botón de 48 px de alto, enlaces debajo.

### 2.2. Crear cuenta

**Objetivo:** crear una cuenta comprensible y segura.

```text
┌─────────────────────────────────────────────┬───────────────────────────────┐
│                                             │                               │
│  ┌───────────────────────────────────────┐  │        [logo]                 │
│  │  Crear cuenta                         │  │        Syntropy               │
│  │                                       │  │                               │
│  │  Nombre de usuario                    │  │  Un mapa para tu año         │
│  │  [_________________________________]  │  │  académico.                  │
│  │                                       │  │                               │
│  │  Correo electrónico                   │  │  [decoración]                 │
│  │  [_________________________________]  │  │                               │
│  │                                       │  │                               │
│  │  Contraseña                           │  │                               │
│  │  [_________________________________]  │  │                               │
│  │                                       │  │                               │
│  │  Repetir contraseña                   │  │                               │
│  │  [_________________________________]  │  │                               │
│  │                                       │  │                               │
│  │  [x] Acepto términos y privacidad     │  │                               │
│  │                                       │  │                               │
│  │  [ Crear cuenta ]                     │  │                               │
│  │                                       │  │                               │
│  │  ¿Ya tienes cuenta? Ingresar          │  │                               │
│  └───────────────────────────────────────┘  │                               │
│                                             │                               │
└─────────────────────────────────────────────┴───────────────────────────────┘
```

**Validaciones:**

- Nombre de usuario: 3–30 caracteres, letras, números y guion bajo.
- Correo con formato válido.
- Contraseña: mínimo 8 caracteres, mayúscula, minúscula y número.
- Repetición igual a la contraseña.
- Términos obligatorios.
- Aviso de edad mínima 13 años.
- Si el correo ya existe, mensaje claro sin revelar datos sensibles.
- Si el nombre de usuario está tomado, se sugiere una variante.

**Móvil:** formulario de una columna, teclado adecuado para correo, mostrar/ocultar contraseña, barra de fortaleza.

### 2.3. Inicio

**Objetivo:** ver el panorama y entrar rápido a cualquier asignatura.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [logo]  Inicio                       [campana]       [avatar]  Usuario      │
├──────────┬───────────────────────────────────────────────┬──────────────────┤
│  ◉ Inicio│  Buenas tardes, Martina                       │  Hoy             │
│  ▤ Calend│  Miércoles 11 de noviembre                    │                  │
│  ◷ Horario│                                               │  Matemática 08:00│
│  ✎ Notas │  Funciones generales                          │  Inglés 10:00    │
│  ✦ Nodos │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │                  │
│  ▣ Biblio│  │Calend. │ │Notas   │ │Bibliot.│ │Nodos   │  │  Vence hoy       │
│          │  └────────┘ └────────┘ └────────┘ └────────┘  │  ● Ensayo        │
│  ⚙ Config│                                               │                  │
│          │  Asignaturas                    [Agregar +]  │  Próximo examen  │
│          │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │  ● 18 nov        │
│          │  │Matemát. │ │ Inglés  │ │ Lengua  │          │                  │
│          │  └─────────┘ └─────────┘ └─────────┘          │                  │
│          │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │                  │
│          │  │Historia │ │ Biología│ │ + Nueva │          │                  │
│          │  └─────────┘ └─────────┘ └─────────┘          │                  │
└──────────┴───────────────────────────────────────────────┴──────────────────┘
```

**Elementos:**

- Saludo y fecha del día.
- Selector de año de curso en la parte superior de la barra lateral.
- “Funciones generales” con cuatro accesos: Calendario general, Calificaciones, Biblioteca y Nodos.
- “Asignaturas” como carpetas de colores; cada carpeta muestra nombre, docente principal y próximo vencimiento.
- Botón “Agregar asignatura” visible, tanto en la cabecera como en la grilla.
- Panel derecho “Hoy”: materias del día, tareas que vencen y próximo examen.
- Si no hay datos, estado vacío con una explicación breve.

**Móvil:**

- Saludo compacto.
- Accesos generales en una fila desplazable horizontal.
- Asignaturas en dos columnas.
- Panel “Hoy” debajo de las asignaturas, no a la derecha.
- FAB “+” para agregar asignatura.
- Barra inferior.

### 2.4. Agregar asignatura

**Objetivo:** crear una asignatura completa sin abrumar.

```text
┌───────────────────────────────┬───────────────────────────────────────────────┐
│ [←] Agregar asignatura        │  Vista previa                                 │
│                               │  ┌─────────────────────────────────────────┐  │
│  Nombre *                     │  │  [color]  Matemática                    │  │
│  [_________________________]  │  │  5.º año · 2026                         │  │
│                               │  │  Prof. Laura Gómez                      │  │
│  Año de curso *               │  │  Lun 08:00–09:30 · Mié 08:00–09:30      │  │
│  [5.º año · 2026       ▼]     │  └─────────────────────────────────────────┘  │
│                               │                                               │
│  Color identificativo *       │  Consejos                                     │
│  ● ● ● ● ● ● ● ● ● ● ● ●     │  Usa un color distinto para cada materia.    │
│                               │  El color se verá en el calendario general.  │
│  Docentes                     │                                               │
│  [_________________________]  │                                               │
│  [+ Agregar docente]          │                                               │
│                               │                                               │
│  Horario                      │                                               │
│  [Lunes ▼] [08:00] [−] [09:30]│                                               │
│  [+ Agregar bloque]           │                                               │
│                               │                                               │
│  Descripción breve            │                                               │
│  [_________________________]  │                                               │
│                               │                                               │
│  ▸ Más detalles               │                                               │
│    Anotaciones importantes    │                                               │
│    Criterios de evaluación    │                                               │
│    Metodología de trabajo     │                                               │
│                               │                                               │
│  [Cancelar]        [Guardar]  │                                               │
└───────────────────────────────┴───────────────────────────────────────────────┘
```

**Decisiones de UX:**

- El color se elige de una paleta predefinida; no se usa un selector libre para evitar combinaciones ilegibles.
- “Más detalles” es un acordeón para notas, criterios y metodología, de modo que el formulario inicial no sea enorme.
- La vista previa se actualiza en vivo en escritorio.
- Los bloques de horario son opcionales.
- Si se agrega un docente, se puede quitar con un ícono.
- Al guardar, se vuelve al inicio con la nueva carpeta resaltada.
- Eliminar una asignatura pide confirmación y advierte que se borrarán sus tareas, notas y nodos.

**Móvil:** una columna; la vista previa se mueve al final como resumen colapsable; botones fijos al pie.

### 2.5. Calendario de asignatura con panel de tareas

**Objetivo:** organizar la materia y ver qué viene.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [logo]  Calendario                     [campana]      [avatar]  Usuario      │
├──────────┬───────────────────────────────────────────────┬──────────────────┤
│  ◉ Inicio│  ● Matemática   [Calendario] Nodos Notas ...  │  Tareas    [Nueva]│
│  ▤ Calend│                                               │  [Todas][Pend.][…]│
│  ◷ Horario│  ◀  Noviembre 2026  ▶    [Hoy]  [Mes][Semana]│                  │
│  ✎ Notas │  ┌────┬────┬────┬────┬────┬────┬────┐        │  ┃ Ensayo         │
│  ✦ Nodos │  │Lun │Mar │Mié │Jue │Vie │Sáb │Dom │        │  ┃ Lengua        │
│  ▣ Biblio│  ├────┼────┼────┼────┼────┼────┼────┤        │  ┃ Vence en 2 días│
│          │  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │        │                  │
│          │  │    │    │    │Ex. │    │    │    │        │  ┃ TP Integral   │
│          │  ├────┼────┼────┼────┼────┼────┼────┤        │  ┃ Matemática    │
│          │  │ 9  │ 10 │ 11 │ 12 │ 13 │ 14 │ 15 │        │  ┃ En espera     │
│          │  │    │Tarea│   │    │    │    │    │        │                  │
│          │  └────┴────┴────┴────┴────┴────┴────┘        │                  │
│          │                                               │                  │
│          │  Próximos                                    │                  │
│          │  ● 12 nov · Trabajo práctico                 │                  │
│          │  ● 18 nov · Examen                           │                  │
└──────────┴───────────────────────────────────────────────┴──────────────────┘
```

**Elementos:**

- Cabecera con el color y el nombre de la asignatura.
- Pestañas de la asignatura.
- Calendario con semana de lunes a domingo.
- Navegación de mes y botón “Hoy”.
- Vistas Mes, Semana y Agenda. En escritorio, Mes por defecto; en móvil, Agenda.
- Panel de tareas a la derecha con:
  - botón “Nueva”;
  - filtros Todas / Pendientes / En espera / Terminadas;
  - tarjetas con barra de color, título, asignatura, tiempo restante y estado;
  - acción para cambiar estado.
- Eventos del calendario:
  - tarea: punto o barra del color;
  - examen: ícono de examen y color de asignatura;
  - sesión de estudio: estilo punteado y etiqueta “Estudio”.
- Días con muchas tareas muestran “+2” y al hacer clic se abre el detalle del día.
- La cuenta regresiva nunca depende solo del color: incluye texto (“Hoy”, “En 2 días”, “Atrasada”).

**Móvil:**

- Agenda diaria por defecto, con selector de fecha horizontal.
- Botón para alternar a mes.
- Tareas debajo del día seleccionado.
- Panel de tareas completo en hoja.
- FAB “Nueva tarea”.

### 2.6. Calendario general

Es la misma estructura, con diferencias:

- No tiene pestañas de asignatura.
- El título es “Calendario general”.
- Muestra tareas y exámenes de todas las asignaturas del año activo.
- Cada evento usa el color de su asignatura.
- Filtros por asignatura y por estado de tarea.
- No muestra sesiones de estudio (según la decisión del documento maestro); si se muestran, será con un interruptor explícito.
- El panel de tareas incluye el nombre de la asignatura en cada tarjeta.

### 2.7. Nodos de conocimiento

**Objetivo:** ver el mapa de temas y su progreso.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [logo]  Nodos                     [campana]        [avatar]  Usuario        │
├──────────┬───────────────────────────────────────────────┬──────────────────┤
│  ◉ Inicio│  Año 2026 ▼     [Todas] [Matemática] [Lengua] │  Matemática      │
│  ▤ Calend│  ┌─────────────────────────────────────────┐  │  Prof. Laura     │
│  ◷ Horario│  │        ○───────◇                       │  │  Lun/Mié 08:00   │
│  ✎ Notas │  │       ╱ ╲     ╱ ╲                      │  │                  │
│  ✦ Nodos │  │      ○   ○───◇   ○                     │  │  Leyenda         │
│  ▣ Biblio│  │       ╲ ╱     ╲ ╱                      │  │  ○ Dificultad 1-2│
│          │  │        ○       ○                       │  │  △ Dificultad 3  │
│          │  │                                        │  │  □ Dificultad 4  │
│          │  │   [zoom −] [100%] [zoom +] [Ajustar]  │  │  ⬡ ...           │
│          │  └─────────────────────────────────────────┘  │                  │
│          │                                               │  Borde por nota  │
│          │  [+ Agregar tema]  [Vista general del año]   │  ○ blanco ...    │
└──────────┴───────────────────────────────────────────────┴──────────────────┘
```

**Elementos:**

- Lienzo oscuro con grilla sutil.
- Nodo raíz de la asignatura, visualmente distinto y sin contorno de nota.
- Nodos hijos con forma según dificultad y relleno según dominio.
- Contorno metálico según promedio de notas.
- Conexiones jerárquicas en gris con ángulos rectos.
- Conexiones entre asignaturas en línea punteada y con etiqueta.
- Panel derecho con información de la asignatura, leyenda y filtros.
- Botones de zoom, porcentaje y “Ajustar”.
- En móvil: pellizcar para zoom, arrastrar para mover, tocar nodo abre hoja inferior.

**Estados:**

- Sin nodos: estado vacío “Crea tu primer tema”.
- Nodo sin notas: contorno neutro discontinuo “Sin calificar”.
- Nodo con dominio bajo: relleno tenue.
- Nodo con dominio alto: relleno intenso.
- Nodo seleccionado: halo y panel de detalle.

### 2.8. Horario

**Objetivo:** ver la semana y las materias del día.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [logo]  Horario                    [campana]        [avatar]  Usuario       │
├──────────┬───────────────────────────────────────────────┬──────────────────┤
│  ◉ Inicio│  Horario semanal            [Hoy] [Semana]    │  Hoy             │
│  ▤ Calend│  ┌──────┬──────┬──────┬──────┬──────┐        │  Matemática 08:00│
│  ◷ Horario│  │ Hora │ Lun  │ Mar  │ Mié  │ Jue  │        │  Inglés 10:00    │
│  ✎ Notas │  ├──────┼──────┼──────┼──────┼──────┤        │  Descanso 11:30  │
│  ✦ Nodos │  │08:00 │ Mat. │ Leng.│ Mat. │ Fís. │        │                  │
│  ▣ Biblio│  │09:30 │      │      │      │      │        │  Actividad       │
│          │  │10:00 │ Ingl.│ Mat. │ Hist.│ Ingl.│        │  Fútbol 17:00    │
│          │  │11:30 │ Desc.│ Desc.│ Desc.│ Desc.│        │                  │
│          │  └──────┴──────┴──────┴──────┴──────┘        │                  │
└──────────┴───────────────────────────────────────────────┴──────────────────┘
```

**Elementos:**

- Grilla semanal con horas y días.
- Bloques de clase con color de asignatura.
- Descansos con estilo neutro y ícono.
- Actividades secundarias sin asignatura, con color propio.
- Panel “Hoy” con la agenda del día.
- Botón “Agregar bloque” con tipo: clase, descanso, actividad, otro.
- En móvil: agenda diaria con selector de fecha; la grilla semanal se puede consultar en horizontal o en modo compacto.

### 2.9. Calificaciones

**Objetivo:** entender el promedio y la nota necesaria.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [logo]  Calificaciones             [campana]        [avatar]  Usuario       │
├──────────┬───────────────────────────────────────────────┬──────────────────┤
│  ◉ Inicio│  Matemática ▼     Escala 1–10 · Aprueba 6     │  Promedio        │
│  ▤ Calend│  ┌─────────────────────────────────────────┐  │      7,4 / 10    │
│  ◷ Horario│  │ Evaluación   Fecha   Nota  Peso  Aporte │  │  [donut]         │
│  ✎ Notas │  │ Parcial 1    12/03   7,0   30%   2,10   │  │                  │
│  ▣ Biblio│  │ TP grupal    02/04   8,5   20%   1,70   │  │  ¿Qué necesito?  │
│          │  │ Parcial 2    15/05   —     25%   —      │  │  Próximo: 25%    │
│          │  │ Final        20/06   —     25%   —      │  │  Necesitas 6,2   │
│          │  └─────────────────────────────────────────┘  │  para aprobar    │
│          │  [+ Nueva evaluación]  [Configurar escala]    │                  │
└──────────┴───────────────────────────────────────────────┴──────────────────┘
```

**Elementos:**

- Selector de asignatura y de año.
- Escala visible: “1–10 · Aprueba 6”.
- Tabla de evaluaciones: nombre, fecha, nota, peso y aporte.
- Evaluaciones sin nota se muestran como “Pendiente”.
- Promedio ponderado y barra/donut.
- Tarjeta de proyección: “Para aprobar necesitas X en la próxima evaluación”.
- Si ya está aprobado, mensaje “Ya alcanzaste la nota mínima”.
- Si es imposible, mensaje “Con el peso restante no es posible alcanzar la nota mínima”.
- Botón para configurar escala y aprobación.
- Advertencia al cambiar la escala: las notas ya cargadas conservan su escala original.

**Móvil:** tarjetas por evaluación en lugar de tabla; promedio y proyección arriba; FAB nueva evaluación.

### 2.10. Biblioteca

**Objetivo:** encontrar fuentes académicas.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [logo]  Biblioteca                 [campana]        [avatar]  Usuario       │
├──────────┬───────────────────────────────────────────────┬──────────────────┤
│  ◉ Inicio│  Buscar [________________________]  [Filtros] │  Detalle         │
│  ▤ Calend│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │  [miniatura]     │
│  ◷ Horario│  │[imagen] │ │[imagen] │ │[imagen] │        │  Título          │
│  ✎ Notas │  │─────────│ │─────────│ │─────────│        │  Asignatura      │
│  ▣ Biblio│  │Título   │ │Título   │ │Título   │        │  Tema            │
│          │  │Matemát. │ │Lengua   │ │Inglés   │        │  Tarea           │
│          │  └─────────┘ └─────────┘ └─────────┘        │  [Abrir]         │
└──────────┴───────────────────────────────────────────────┴──────────────────┘
```

**Elementos:**

- Buscador y filtros por asignatura, tipo, nodo y tarea.
- Cuadrícula de tarjetas con miniatura, título, tipo, asignatura, tema y tarea.
- Barra superior de color de asignatura.
- Menú de tres puntos para editar, eliminar o abrir.
- Botón “Agregar fuente”.
- Fase 6; se diseña ahora, no se implementa en el MVP.

### 2.11. Perfil y configuración

- Perfil: avatar, nombre visible, nombre de usuario, correo, cambio de contraseña, cierre de sesión.
- Configuración: año de curso, zona horaria, escala de calificaciones, notificaciones por correo, tema, idioma, eliminación de cuenta.
- No se implementa cambio de correo en el MVP sin verificación; se puede solicitar en fase posterior.

---

## 3. Pantallas móviles

### 3.1. Inicio móvil

```text
┌─────────────────────────────┐
│ [logo]  Hola, Martina  [◉]  │
│ Miércoles 11 de noviembre   │
│                             │
│ Funciones                   │
│ [Calendario] [Notas] [→]    │
│                             │
│ Asignaturas       [+ Agregar]│
│ ┌─────────┐ ┌─────────┐     │
│ │Matemát. │ │ Inglés  │     │
│ └─────────┘ └─────────┘     │
│ ┌─────────┐ ┌─────────┐     │
│ │ Lengua  │ │Historia │     │
│ └─────────┘ └─────────┘     │
│                             │
│ Hoy                         │
│ 08:00 Matemática            │
│ 10:00 Inglés                │
│ Vence: Ensayo de Lengua      │
│                             │
├─────────────────────────────┤
│ Inicio Calend. Horario Notas Más │
└─────────────────────────────┘
```

### 3.2. Calendario de asignatura móvil

```text
┌─────────────────────────────┐
│ [←] ● Matemática       [⋯]  │
│ [Calendario][Nodos][Notas]  │
│                             │
│ ◀  Noviembre 2026  ▶  [Mes] │
│ Lun Mar Mié Jue Vie Sáb Dom │
│  2   3   4   5   6   7   8  │
│      •       ▲              │
│                             │
│ Miércoles 11               │
│ ┌─────────────────────────┐ │
│ │ ● Ensayo de Lengua      │ │
│ │   Vence hoy             │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ▲ Examen de Matemática  │ │
│ │   18 nov · 08:00        │ │
│ └─────────────────────────┘ │
│                             │
│ [ Ver todas las tareas ]    │
│                       [+]   │
├─────────────────────────────┤
│ Inicio Calend. Horario Notas Más │
└─────────────────────────────┘
```

### 3.3. Panel de tareas como hoja

```text
┌─────────────────────────────┐
│          ─────              │
│  Tareas              [X]    │
│  [Todas][Pend.][Espera][✓]  │
│                             │
│  ┃ Ensayo de Lengua         │
│  ┃ Vence hoy · Pendiente    │
│  ┃                          │
│  ┃ TP Integral              │
│  ┃ En 2 días · En espera    │
│  ┃                          │
│  ┃ Resumen de Biología      │
│  ┃ Atrasada · Pendiente     │
│                             │
│  [ + Nueva tarea ]          │
└─────────────────────────────┘
```

### 3.4. Nodos móvil

- Lienzo a pantalla completa.
- Barra superior con asignatura y filtro.
- Botones flotantes de zoom y “Ajustar”.
- Panel de detalle como hoja inferior al tocar un nodo.
- Leyenda colapsable.
- Modo “solo esta asignatura” / “todas del año”.

---

## 4. Componentes transversales de los wireframes

### 4.1. Barra superior

- Logo monocromo o de color según la pantalla.
- Título de sección.
- Campana con punto de actividad si hay vencimientos próximos.
- Avatar y menú de perfil.
- En móvil: logo, título compacto y avatar; la campana puede estar dentro del menú.

### 4.2. Barra lateral

- Inicio
- Calendario
- Horario
- Calificaciones
- Nodos
- Biblioteca
- Configuración

El ítem activo tiene barra rosa a la izquierda y texto blanco. Los inactivos son gris claro.

### 4.3. Panel derecho

- Tareas en calendario.
- Información de asignatura en nodos.
- Detalle de fuente en biblioteca.
- Resumen en calificaciones.
- En pantallas menores se convierte en cajón u hoja.

### 4.4. Botón flotante

- Esquinas redondeadas, 56 px en móvil, 48 px en escritorio.
- Sombra suave y color de acento.
- Acción contextual según la pantalla.

### 4.5. Modales y hojas

- En escritorio: diálogo centrado, ancho máximo 560–720 px.
- En móvil: hoja a pantalla completa o bottom sheet.
- Siempre con título, cierre visible y acción principal.
- `Esc` cierra en escritorio.
- Foco atrapado dentro del diálogo.

---

## 5. Estados vacíos y de error

| Situación | Mensaje | Acción |
|---|---|---|
| Sin asignaturas | “Todavía no tienes asignaturas. Crea la primera para empezar.” | Agregar asignatura |
| Sin tareas | “No hay tareas con este filtro.” | Nueva tarea / limpiar filtro |
| Sin exámenes | “No hay exámenes próximos.” | Nuevo examen |
| Sin notas | “Aún no registraste evaluaciones.” | Nueva evaluación |
| Sin nodos | “Crea tu primer tema y empieza a construir tu mapa.” | Agregar tema |
| Sin biblioteca | “Tu biblioteca está vacía.” | Agregar fuente |
| Sin conexión | “Sin conexión. Puedes consultar lo que ya cargaste.” | Reintentar |
| Error de carga | “No pudimos cargar esta sección.” | Reintentar |
| Sin permisos | “No encontramos esta página.” | Volver al inicio |

---

## 6. Qué falta definir antes de implementar

- Contenido exacto de la campana (D6).
- Comportamiento del año de curso (D2).
- Visual del nodo raíz (D5).
- Obligatoriedad del nodo en biblioteca (D7).
- Consentimiento de menores (D8).
- Tratamiento de la caché offline (D9).
- Logo definitivo (D10).

---

## 7. Cómo revisar la propuesta

1. Abrir `presentacion.html`.
2. Recorrer el mapa de navegación.
3. Comparar los wireframes de escritorio y móvil.
4. Revisar el sistema de diseño.
5. Leer las decisiones pendientes.
6. Aprobar o pedir cambios antes de la Fase 2.
