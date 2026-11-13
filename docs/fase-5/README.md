# Fase 5 — Nodos de conocimiento

**Estado:** implementada el 13 de noviembre de 2026 (5A y 5B). Probada con pruebas automáticas, en el navegador contra una base PostgreSQL local y, el 13 de noviembre de 2026, contra el proyecto real de Supabase (nodos, conexiones entre materias, cascadas y aislamiento A/B; ver [`docs/fase-8/04-validacion-real.md`](../fase-8/04-validacion-real.md)). **Aprobada por el usuario el 13 de noviembre de 2026.**

**Alcance (documento maestro):** ingreso de temas, árbol y visualización interactiva (zoom, arrastre, ramas); reglas visuales de forma, intensidad y contorno; resumen tipo mapa conceptual y adjuntos; vinculación de tareas y exámenes con nodos; un plano por año de curso con menú rápido a cada nodo principal y enlaces entre materias.

No hizo falta cambiar la base: `nodes`, `node_links` y `sources` existen desde la migración 001 (y 002 para D7). La librería es React Flow (`@xyflow/react` 12.12.1), la prevista en la arquitectura.

---

## 1. Qué se agregó

| Área | Qué hace |
|---|---|
| Plano del año (`/nodos`) | Los árboles de todas las asignaturas del año activo en un mismo lienzo, con zoom, paneo y un menú rápido que centra cada nodo principal. |
| Árbol de la asignatura (`/asignaturas/:id/nodos`) | El mapa de una sola materia, dentro de sus pestañas. |
| Nodo raíz (D5) | La app lo genera sola para cada asignatura que todavía no lo tiene. Es un hexágono grande con el color de la materia, sin dificultad, dominio ni contorno. |
| Temas | Hasta tres niveles (principal, secundario, terciario). Nombre, dificultad, dominio, descripción y resumen. |
| Forma = dificultad | Círculo (1–2), triángulo, cuadrado, pentágono, hexágono, heptágono, octógono y eneágono (9–10). |
| Relleno = dominio | Color de la asignatura con intensidad de 0,18 a 0,90, mezclado con el fondo para que sea sólido. |
| Contorno = notas | Promedio simple de los porcentajes de las notas vinculadas, cada una con su escala. Blanco, bronce, plata, oro, diamante y multicolor; sin notas, gris discontinuo. Separado 3 px del relleno. |
| Panel del tema | Dificultad, dominio y contorno con número y texto («Plata · 67 %»), resumen, notas, tareas y exámenes vinculados, subtemas, conexiones y adjuntos. |
| Conexiones | Entre temas de cualquier materia, con relación opcional. Línea punteada del color de la materia de origen; se resaltan al seleccionar un tema. |
| Modos | «Explorar» (no se arrastra nada por accidente) y «Mover temas» (arrastrar guarda la posición). «Ordenar mapa» acomoda el árbol automáticamente. |
| Vínculos | Tareas, exámenes y evaluaciones tienen un campo «Tema» con los temas de su asignatura. |
| Adjuntos (5B) | Enlaces y archivos (PDF, Word, PowerPoint, texto, imágenes, audio, video MP4; hasta 25 MB) en el bucket privado `academic-files`. Se abren con enlace firmado de 10 minutos. Se guardan como fuentes de la biblioteca vinculadas al tema, para que la Fase 6 las muestre sin migrar nada. |
| Accesibilidad | Cada nodo tiene una descripción completa para lectores de pantalla, hay una lista de temas fuera del lienzo y la leyenda explica forma, intensidad y contorno con texto. Controles de 44 px en pantallas táctiles. |

### 1.1. Reglas implementadas

- Un solo nodo raíz por asignatura; si dos pestañas lo crean a la vez se usa el que ya existe.
- Eliminar un tema elimina su subárbol y sus conexiones. Se avisa cuántos temas se borran. Las tareas, exámenes y notas vinculados se conservan sin tema.
- Si el tema o un subtema tiene adjuntos, la base bloquea el borrado y la app explica que hay que quitarlos primero (decisión del modelo para no perder archivos).
- El tema de una tarea, examen o nota tiene que ser de su misma asignatura; al cambiar la asignatura en el formulario, el tema se limpia.
- Las conexiones no crean jerarquía y no se duplican en ningún sentido.

---

## 2. Pruebas

- **Automáticas:** formas, intensidad, mezcla de color, rangos del contorno, el caso 10 de la sección 5.4 (nodo con notas de escalas distintas: 7/10 y 15/20 dan 70,83 %, Oro), niveles, subárbol, orden automático del árbol y del plano, conexiones, formulario del tema, adjuntos y vínculo de tareas.
- **Base de datos (PGlite con roles y RLS):** una raíz por asignatura, restricciones de raíz y tema, padre de la misma asignatura, conexiones entre materias sin duplicados, aislamiento entre cuentas, borrado bloqueado por adjuntos y borrado del subárbol dejando la tarea sin tema. Total con las fases anteriores: 38/38.
- **Navegador:** plano del año con raíces generadas para tres materias, menú rápido, panel del tema, alta de subtema, adjuntar enlace y archivo (descarga con enlace firmado y acceso ajeno rechazado), borrado bloqueado por adjuntos, borrado de un subtema, conexión entre temas, «Ordenar mapa» sin superposiciones y contorno recalculado al vincular una nota (9,5/10 → Diamante). En celular se corrigió que el menú rápido tapaba el selector de modo.

### Limitaciones

- La validación real del 13/11/2026 cubrió nodos, conexiones entre materias, cascadas y aislamiento A/B en Supabase; los adjuntos se probaron con Storage real en la Fase 6. No se probó el mapa con decenas de nodos ni en Safari/Firefox.
- Al arrastrar un tema no se mueven sus subtemas; «Ordenar mapa» vuelve a acomodar todo.
- El resumen es texto con sangrías (estilo esquema), no un diagrama dibujado.
- Las fuentes no tienen miniatura todavía (Fase 6).
