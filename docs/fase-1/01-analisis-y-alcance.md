# Syntropy — Fase 1
## Análisis, alcance e interpretación del proyecto

**Estado:** propuesta para aprobación  
**Fecha:** 10 de noviembre de 2026  
**Fuente principal:** `Syntropy documento maestro del proyecto.docx`  
**Referencias visuales revisadas:** `1.png` a `6.png`

---

## 1. Qué es Syntropy

Syntropy es una aplicación de organización académica para estudiantes de secundaria y universidad. Su propósito no es ser un videojuego, sino usar lenguaje visual de progresión —nodos, mapas, niveles de dominio y carpetas— para que estudiar y planificar resulte más claro y motivador.

La aplicación debe permitir que un estudiante:

1. Organice sus asignaturas por año de curso.
2. Vea sus tareas, proyectos y exámenes en calendarios.
3. Planifique sesiones de estudio.
4. Consulte su horario semanal.
5. Registre calificaciones y sepa qué nota necesita para aprobar.
6. Construya, más adelante, un mapa de conocimiento por asignatura y por año.
7. Guarde fuentes académicas en una biblioteca.
8. Reciba recordatorios por correo.

La prioridad del producto es la **claridad académica**. La gamificación visual es un apoyo, no un sustituto de la organización.

---

## 2. Interpretación de las referencias visuales

Se revisaron las seis imágenes disponibles. El prompt mencionaba dos, pero el expediente contiene seis; se usaron todas.

| Imagen | Contenido | Lectura de diseño |
|---|---|---|
| `1.png` | Inicio de sesión | Composición partida en diagonal, fondo con grilla, marca a la izquierda y formulario en tarjeta a la derecha. |
| `2.png` | Registro | La composición se invierte: formulario a la izquierda, marca a la derecha. |
| `3.png` | Inicio | Barra superior, tarjeta de funciones generales y asignaturas como carpetas de colores. |
| `4.png` | Agregar asignatura | Formulario en tarjeta, selector de color y panel de vista previa a la derecha. |
| `5.png` | Calendario | Mes de lunes a domingo, celdas amplias, menú lateral de iconos y panel derecho de tareas. |
| `6.png` | Detalle de tarea | Tarjeta grande con barra de color de la asignatura, acciones circulares y panel de tareas. |

### Lo que se conserva

- Tema oscuro con azul noche.
- Acento rosa y morado.
- Tarjetas de esquinas muy redondeadas.
- Carpetas de asignaturas como objeto visual principal.
- Calendario amplio, legible y con la semana iniciando en lunes.
- Panel de tareas a la derecha en escritorio.
- Logo de cerebro con circuitos y nodos.

### Lo que se corrige o evoluciona

- La diagonal rosa se reserva para acceso y registro; no se repite en todas las pantallas.
- Se elimina el exceso de círculos grandes en las tarjetas de tareas; la información y el tiempo restante deben leerse primero.
- Se incorpora una jerarquía tipográfica más clara y tamaños de texto accesibles.
- Los formularios dejan de ser barras blancas sobre tarjeta gris; se usan campos oscuros con borde, foco visible y etiquetas persistentes.
- El menú lateral se amplía para incluir Inicio, Calendario, Horario, Calificaciones, Nodos, Biblioteca y Configuración.
- En móvil no se reduce la interfaz de escritorio: se diseña una navegación inferior, agenda diaria y paneles desplegables.

---

## 3. Alcance del MVP

El documento maestro define el MVP como las fases 2, 3 y 4.

### Incluido en el MVP

- Registro, inicio de sesión, recuperación de contraseña y perfil.
- Años de curso y asignaturas.
- Carpetas de asignaturas con crear, editar y eliminar.
- Calendario individual y general.
- Tareas, proyectos y exámenes con fecha límite.
- Panel de tareas con estados y filtros.
- Planes de estudio para exámenes.
- Horario semanal con materias, descansos y actividades.
- Calificaciones, ponderaciones, promedios y proyección.
- Web instalable como PWA.
- Empaquetado de Windows, Android e iOS desde la misma base de código.

### Preparado en el modelo, pero fuera del MVP

- Nodos de conocimiento y conexiones entre asignaturas.
- Biblioteca de fuentes.
- Recordatorios por correo con Resend.
- Gamificación de puntos, niveles, experiencia y rachas.

### Explícitamente fuera de alcance

- Leer la bandeja de correo del estudiante.
- Integración con Gmail u Outlook.
- Edición sin conexión.
- Sincronización offline completa.
- Puntos, niveles, rachas y logros.
- Chat, redes sociales o funciones colaborativas.

---

## 4. Decisiones de producto que guían el diseño

Estas decisiones se derivan del documento maestro y del prompt, y se aplican en todos los entregables:

1. **Una sola aplicación.** Web, Windows, Android e iOS comparten código, componentes y reglas de negocio.
2. **La asignatura es el contenedor principal.** Al entrar en una asignatura se muestra su calendario.
3. **El calendario general muestra fechas límite y exámenes de todas las asignaturas.** El calendario individual puede mostrar además las sesiones de estudio.
4. **La semana empieza el lunes.** Se aplica en calendario, horario y generación de planes.
5. **Las tareas tienen tres estados:** Pendiente, En Espera y Terminada.
6. **El color de la asignatura manda en el calendario general.** En el calendario individual la tarea puede tener un color propio.
7. **Las calificaciones no asumen una escala.** Se configuran mínimo, máximo, aprobación y ponderaciones.
8. **La gamificación de la versión 1 es visual.** No hay puntos ni niveles de experiencia.
9. **Los datos son privados.** Cada usuario solo accede a los suyos mediante RLS.
10. **La interfaz, los mensajes y la documentación están en español.**

---

## 5. Contradicciones y observaciones detectadas

Antes de desarrollar, estas son las diferencias que necesitan una decisión explícita. El detalle y la recomendación están en `07-decisiones-pendientes.md`.

### 5.1. Windows: Tauri frente a PWA

- **Documento maestro (Fase 0, aprobada):** “App para móviles y web para computadoras, con una sola base de código”.
- **Prompt de desarrollo:** pide Tauri 2 para generar un instalador de Windows.

**Lectura:** no son incompatibles si Tauri envuelve la misma aplicación web. Pero sí cambia la estrategia de distribución y agrega Rust al entorno de desarrollo. Se recomienda mantener la PWA y sumar Tauri para Windows, porque el prompt lo exige explícitamente. Requiere aprobación.

### 5.2. iOS no se puede compilar en Windows

Capacitor genera el proyecto iOS, pero la compilación y firma requieren macOS con Xcode. Un desarrollador en Windows necesita una Mac o un servicio de CI con runner macOS. Esto es una restricción técnica, no una decisión de diseño. Se recomienda planificar iOS para después de validar Android y Windows, sin prometer una fecha de tienda en el MVP.

### 5.3. “Año de curso” no está definido

El documento lo menciona como entidad, pero no aclara si es:

- un año calendario (“2026”),
- un nivel educativo (“5.º año de secundaria”),
- o ambos.

Se propone que “Año de curso” sea un ciclo con nombre y fechas, por ejemplo “5.º año · 2026”, y que las asignaturas cuelguen de él. Debe existir un año activo.

### 5.4. Registro con nombre de usuario

El registro de la referencia pide “Nombre de Usuario”, pero Supabase Auth identifica con correo. Se propone:

- correo y contraseña en Supabase Auth;
- nombre de usuario único en el perfil, sin distinguir mayúsculas;
- validación de 3 a 30 caracteres;
- posibilidad de cambiarlo desde el perfil.

### 5.5. Horario dentro de la asignatura y horario general

El formulario de asignatura incluye “horario”, pero el horario es una sección independiente que también admite descansos y actividades sin asignatura. Para no duplicar datos, se propone un único modelo de bloques de horario:

- un bloque puede tener asignatura o no;
- los bloques creados desde una asignatura aparecen en el horario general;
- los descansos y actividades no requieren asignatura.

### 5.6. Campana y sobre en la barra superior

Las maquetas muestran campana y sobre. El prompt pide “notificaciones”, pero los correos son recordatorios futuros y no hay bandeja interna. Se propone:

- **campana:** panel de próximos vencimientos y exámenes, calculado con datos existentes;
- **sobre:** se elimina de la barra; los correos se configuran en preferencias y pertenecen a la Fase 7.

### 5.7. Biblioteca: nombre y clasificación

- Se usará **Biblioteca**, no “Librería”.
- El documento pide que cada fuente se asocie obligatoriamente a asignatura, tema y tarea cuando corresponda. Se respetará, pero se advierte que exigir un nodo puede bloquear la carga si el estudiante todavía no creó el árbol. Se recomienda permitir “Sin tema” como estado inicial, con un filtro para completar después.

### 5.8. Nodo principal de la asignatura

El documento dice que se genera un nodo principal por asignatura. No aclara si ese nodo principal tiene dificultad, dominio y contorno. Se propone que sea un **nodo contenedor de asignatura**, visualmente distinto, sin contorno metálico ni dificultad, y que los temas evaluables sean sus hijos. Esto evita que el promedio de la asignatura complete el contorno de un nodo que no es un tema de estudio.

### 5.9. Escala de calificaciones

El documento exige escalas configurables. El diseño propone:

- escala mínima y máxima por usuario;
- nota de aprobación;
- peso por evaluación;
- promedio ponderado normalizado;
- proyección de la nota necesaria.

No se asume 1–10. La interfaz muestra la escala activa y permite cambiarla con una advertencia sobre notas ya cargadas.

### 5.10. Privacidad de menores

La aplicación puede ser usada por menores. El documento deja la política de privacidad y los términos para la Fase 8, pero el registro del MVP ya recoge datos. Se recomienda:

- edad mínima de 13 años;
- aceptación explícita de términos y privacidad;
- no pedir fecha de nacimiento en el MVP;
- revisión legal antes de la publicación;
- política de eliminación de cuenta y datos.

### 5.11. Caché sin conexión y dispositivos compartidos

La PWA debe permitir consultar datos ya cargados sin conexión. Guardar datos académicos en IndexedDB implica un riesgo si el dispositivo es compartido. Se propone:

- caché separada por usuario;
- limpieza de caché al cerrar sesión;
- no cachear respuestas de Supabase en el service worker;
- caducidad de 24 horas;
- aviso visible de “modo sin conexión, solo lectura”.

### 5.12. Nombre de secciones

Se unifican los nombres de la interfaz:

| Maqueta | Nombre final |
|---|---|
| Librería | Biblioteca |
| Nodos Interactivos | Nodos de conocimiento |
| Calificaciones / Controlador de notas | Calificaciones (en la interfaz) |
| Inicio | Inicio |
| Añadir Asignatura | Agregar asignatura |
| Panel de Tareas | Tareas |

---

## 6. Problemas técnicos y riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Falta de entorno instalado | No se puede ejecutar nada todavía | Instalar Node, Git y editor en la Fase 2; Rust/Android después |
| Tauri requiere Rust y MSVC | Curva de aprendizaje y builds más lentos | Empezar por PWA; agregar Tauri cuando la interfaz base funcione |
| iOS requiere macOS | No se puede compilar localmente en Windows | Usar CI macOS o una Mac; planificar después de Android |
| Datos de menores | Riesgo legal y de confianza | Edad mínima, consentimiento, política y eliminación de cuenta |
| Caché offline | Fuga de datos en equipos compartidos | Caché por usuario, limpieza al salir, sin cachear respuestas autenticadas |
| FullCalendar en móvil | Calendario ilegible en pantallas pequeñas | Vista agenda por defecto en móvil, mes como alternativa |
| React Flow en móvil | Nodos y conexiones difíciles de manipular | Zoom, “ajustar a pantalla”, panel inferior y objetivos táctiles grandes |
| Cálculos de notas | Errores con escalas y pesos | Pruebas unitarias y fórmula documentada |
| RLS mal configurado | Exposición de datos académicos | Políticas por usuario, claves compuestas y pruebas con dos cuentas |
| Alcance creciente | El MVP no termina | Fases cerradas; nodos, biblioteca y correo fuera del MVP |

---

## 7. Criterios de éxito de la Fase 1

La Fase 1 se considera aprobada cuando el usuario confirma:

1. La estrategia de plataformas y empaquetado.
2. El mapa de navegación de escritorio y móvil.
3. La identidad visual y la dirección del logo.
4. El modelo de datos y las reglas de calificación.
5. Las decisiones pendientes de la sección 8.

No se escribirá código de la aplicación hasta recibir esa aprobación.

---

## 8. Qué se entrega en esta fase

- `01-analisis-y-alcance.md`: este documento.
- `02-arquitectura-tecnica.md`: stack, estructura, seguridad y despliegue.
- `03-mapa-navegacion.md`: rutas y navegación por plataforma.
- `04-wireframes.md`: descripción de las pantallas y enlace a la vista visual.
- `05-sistema-diseno.md`: identidad, tokens, componentes y accesibilidad.
- `06-modelo-datos.md`: entidades, relaciones, fórmulas y RLS.
- `07-decisiones-pendientes.md`: decisiones que requieren aprobación.
- `presentacion.html`: vista visual navegable con wireframes, sistema de diseño y mapa de datos.
- `supabase/migrations/001_schema_inicial.sql`: esquema propuesto, todavía **no aplicado**.
- `docs/assets/`: logo vectorial provisional y tipografía.

---

## 9. Conclusión

Syntropy tiene una identidad fuerte y un alcance realista si se respeta el orden propuesto. El mayor riesgo no es visual: es intentar construir demasiadas cosas a la vez. La recomendación es cerrar primero el núcleo académico —cuentas, asignaturas, calendario, tareas, horario y notas— y dejar los nodos, la biblioteca y el correo para después, con el modelo de datos ya preparado.

La siguiente acción es revisar la presentación visual y aprobar o corregir las decisiones de `07-decisiones-pendientes.md`.
