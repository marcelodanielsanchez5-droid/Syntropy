# Fase 6 — Biblioteca de fuentes

**Estado:** implementada el 13 de noviembre de 2026. Probada con pruebas automáticas, en el navegador contra una base PostgreSQL local con un Storage local y, el 13 de noviembre de 2026, contra el proyecto real de Supabase (migración 004, cuota de 200 MB, 1000 fuentes, carga/descarga/borrado real en `academic-files`, aislamiento A/B; ver [`docs/fase-8/04-validacion-real.md`](../fase-8/04-validacion-real.md)). **Aprobada por el usuario el 13 de noviembre de 2026.** Los límites fueron aprobados por el usuario el 13 de noviembre de 2026.

**Alcance (documento maestro):** subida de libros, enlaces, documentos, videos e imágenes; etiquetado con asignatura, tema y tarea; vista con miniatura y contorno del color de la asignatura; búsqueda y filtros; límites de tamaño por archivo y por usuario.

---

## 1. Qué se agregó

| Área | Qué hace |
|---|---|
| Biblioteca (`/biblioteca`) | Fuentes de todas las asignaturas del año activo en una cuadrícula, con «Mostrar más» de a 24. |
| Pestaña Biblioteca de la asignatura | Las fuentes de esa materia, con el mismo diseño y sin el filtro de asignatura. |
| Tarjetas (wireframe 2.10) | Barra superior y contorno del nombre de la materia con su color, miniatura (o ícono del tipo), título, tipo, tema y tarea, y menú de tres puntos con Abrir, Editar y Eliminar. |
| Detalle | Panel derecho en escritorio y hoja desde abajo en el celular: vista previa, tema (con acceso al mapa), tarea, descripción, etiquetas, tamaño y fecha. |
| Agregar fuente | Archivo (elegir o arrastrar y soltar) o enlace. Título y tipo se completan solos (un enlace de YouTube o Vimeo se marca como video) y se pueden cambiar. Asignatura obligatoria; tema y tarea opcionales (D7). Etiquetas separadas por comas. |
| Miniaturas | Para las imágenes, el navegador genera una miniatura JPEG de hasta 480 px y la guarda junto al archivo; la cuadrícula descarga solo las miniaturas visibles, con enlaces firmados en lote. |
| Búsqueda y filtros | Busca en título, descripción y etiquetas sin distinguir tildes ni mayúsculas. Filtros por asignatura, tipo, tema (incluido «Sin tema») y tarea (incluido «Sin tarea»). |
| Espacio | Medidor «4,4 MB de 200 MB · 6 de 1000 fuentes». Antes de subir se avisa si el archivo no entra. |
| Adjuntos de nodos | Los adjuntos de la Fase 5 usan el mismo servicio: cuentan para el espacio, tienen miniatura y aparecen en la biblioteca con su tema. |

### 1.1. Límites (decisión D27, aprobada el 13 de noviembre de 2026)

El modelo de datos dejó «el máximo de fuentes por usuario» para esta fase. Se aprobó:

| Límite | Valor | Dónde se hace cumplir |
|---|---|---|
| Tamaño por archivo | 25 MB | Bucket `academic-files` (ya existía) y la app antes de subir |
| Espacio por usuario | 200 MB | Disparador en la base (`SY001`) y la app antes de subir |
| Fuentes por usuario | 1000 | Disparador en la base (`SY002`) y la app |

Con el plan gratuito de Supabase (1 GB de Storage en total) estos valores alcanzan para unas pocas cuentas: conviene revisarlos antes de abrir el registro. Se cambian reemplazando la función `public.library_limits()` y la constante de `src/features/library/library-rules.ts`.

---

## 2. Migración `004_biblioteca.sql`

1. Agrega `size_bytes` y `mime_type` a `sources`.
2. Crea `public.library_limits()` y un disparador que rechaza superar el espacio o la cantidad de fuentes.
3. Limita lo que el cliente puede editar de una fuente: título, descripción, tipo, enlace, etiquetas, asignatura, tema y tarea. El archivo, su tamaño, su tipo y la miniatura se fijan al crearla; así el tamaño declarado no se puede bajar después para esquivar el límite.
4. Al final comprueba los permisos y, si algo no quedó como debe, falla y revierte todo.

**Limitación honesta:** el tamaño lo informa la app al registrar la fuente. Un cliente modificado podría declarar menos de lo que sube; el bucket igual impide archivos de más de 25 MB. Un control exacto del espacio necesitaría una Edge Function que lea el tamaño real en Storage.

La ruta de cada archivo sigue el modelo de datos: `{user_id}/{source_id}/archivo` (y `miniatura.jpg` en la misma carpeta).

---

## 3. Pruebas

- **Automáticas:** límites de subida (tipo, 25 MB, 200 MB, 1000 fuentes), espacio usado, tamaños legibles, tipos por archivo y por enlace, títulos y rutas, etiquetas, búsqueda sin tildes, filtros, formulario de fuente y subida (ruta con el id de la fuente, tamaño y tipo registrados, y borrado del archivo si la base rechaza la fuente).
- **Base de datos (PGlite con roles y RLS):** se guarda una fuente dentro del límite, se rechaza superar los 200 MB, los enlaces no ocupan espacio, el tamaño no se puede cambiar, el título y las etiquetas sí, la app puede leer los límites y otra cuenta no ve las fuentes ajenas. Total con las fases anteriores: 45/45.
- **Navegador:** cuadrícula con miniaturas firmadas, detalle, búsqueda y filtros; subida de una imagen real con miniatura generada, rechazo de un archivo de 26 MB, enlace de YouTube detectado como video, edición, borrado desde el menú (el archivo y la miniatura desaparecen del Storage y el espacio vuelve a bajar), pestaña de la asignatura y celular (se corrigió un desborde horizontal de 9 px).

### Limitaciones

- La validación real del 13/11/2026 cubrió cuota de 200 MB, 1000 fuentes, carga/descarga/borrado en `academic-files` y aislamiento A/B. No se subió un archivo de 25 MB (solo se comprobó el límite del bucket) ni se probó en Safari/Firefox.
- Los PDF, documentos y videos no tienen miniatura propia: se muestra el ícono del tipo.
- El archivo de una fuente no se reemplaza: hay que borrarla y subir otra.
