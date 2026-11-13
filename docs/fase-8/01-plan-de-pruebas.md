# Fase 8 · Plan de pruebas con estudiantes

El documento maestro pide probar Syntropy con **5 a 10 estudiantes reales** antes del lanzamiento y ajustar la usabilidad con lo que surja. Este plan está listo para usar; las sesiones las tiene que hacer el equipo.

---

## 1. Objetivo

Comprobar que un estudiante puede organizar su cursada sin ayuda y encontrar los problemas que más molestan antes de abrir el registro.

Preguntas que tiene que responder:

1. ¿Se entiende cómo empezar (año de curso, asignaturas)?
2. ¿El calendario y el panel de tareas alcanzan para organizar un trimestre?
3. ¿Se entiende la nota que falta para aprobar?
4. ¿El mapa de temas y la biblioteca se usan o se ignoran?
5. ¿Llegan los recordatorios y sirven?
6. ¿Funciona bien en el celular?

---

## 2. Participantes

| Perfil | Cantidad |
|---|---|
| Secundario (13 a 17 años) | 2 a 4 |
| Terciario o universitario | 3 a 6 |
| Usan sobre todo el celular | al menos la mitad |

- **Menores de 18:** antes de la sesión, autorización escrita de su madre, padre o tutor. Si se graba la pantalla o la voz, consentimiento aparte para la grabación.
- A todos: explicar para qué es la prueba, que se puede abandonar en cualquier momento y que se evalúa la app, no a la persona.
- Cuentas nuevas creadas por cada participante con su propio correo. Al terminar, se ofrece eliminar la cuenta.

---

## 3. Preparación

- Entorno: el proyecto de Supabase en el que se va a lanzar (o uno idéntico), con las migraciones 001 a 006, la función de recordatorios y SMTP propio funcionando.
- Dispositivos: el celular de cada participante y una computadora.
- Material: un PDF y una foto para subir (no personales), y este documento impreso o en otra pantalla.
- Duración: 45 a 60 minutos por persona.
- Moderación: una persona guía y otra toma notas. No se ayuda salvo que la persona esté trabada más de 2 minutos; si se ayuda, se anota.

---

## 4. Tareas

Leer cada tarea en voz alta, sin nombrar botones. Pedir que piensen en voz alta.

| # | Tarea | Éxito |
|---|---|---|
| 1 | Creá una cuenta y entrá. | Confirma el correo y llega al inicio. |
| 2 | Cargá tu año de curso y tres materias reales, con su color y su docente. | Tres asignaturas visibles en el inicio. |
| 3 | Armá el horario de esta semana. | Al menos 5 bloques en el horario. |
| 4 | Agregá dos tareas que tengas pendientes y un examen con plan de estudio. | Se ven en el calendario con la cuenta regresiva. |
| 5 | Marcá una tarea como terminada y buscá solo las pendientes. | Usa el filtro del panel. |
| 6 | Configurá cómo te califican y cargá dos notas. Decime qué necesitás sacar para aprobar. | Lee la nota necesaria. |
| 7 | En una materia, armá el mapa con tres temas, uní dos y adjuntá una foto a un tema. | Mapa con tres temas, un enlace y un adjunto. |
| 8 | Subí un PDF a la biblioteca, asociado a una materia y un tema, y encontralo buscando. | Lo encuentra con la búsqueda o los filtros. |
| 9 | Activá los recordatorios por correo y mandate una prueba. | El correo llega (anotar si fue a spam). |
| 10 | Instalá la app en el celular y abrila sin conexión. | Ve sus datos sin internet. |
| 11 | Descargá una copia de tus datos. | Obtiene el archivo JSON. |

Las tareas **1, 2, 4 y 9** son críticas: sin ellas la app no cumple su función.

---

## 5. Qué medir

Por cada tarea y participante:

- Resultado: **sola** / **con ayuda** / **no la completó**.
- Tiempo aproximado.
- Errores y dudas (frases textuales).

Al final, el cuestionario **SUS** (System Usability Scale, de uso libre), de 1 = muy en desacuerdo a 5 = muy de acuerdo:

1. Creo que me gustaría usar esta app seguido.
2. La app me pareció innecesariamente complicada.
3. Me pareció fácil de usar.
4. Creo que necesitaría ayuda de alguien con conocimientos técnicos para usarla.
5. Las distintas funciones están bien integradas.
6. Hay demasiadas inconsistencias.
7. Imagino que la mayoría aprendería a usarla muy rápido.
8. Me resultó muy incómoda de usar.
9. Me sentí con confianza al usarla.
10. Tuve que aprender muchas cosas antes de poder usarla.

Puntaje: en las impares se resta 1 a la respuesta; en las pares, la respuesta se resta de 5. Se suman y se multiplican por 2,5 (resultado de 0 a 100). 68 es el promedio habitual.

Preguntas abiertas:

- ¿Qué fue lo más útil? ¿Qué te molestó?
- ¿Qué usabas antes para organizarte? ¿Lo cambiarías por esto?
- ¿Usarías los recordatorios? ¿Con cuánta anticipación?
- ¿Hay algo que esperabas encontrar y no está?

---

## 6. Registro de hallazgos

Una fila por problema, en una planilla compartida:

| Pantalla | Qué pasó | Participantes | Severidad | Propuesta |
|---|---|---|---|---|

Severidad:

- **Crítica:** impide completar una tarea crítica o pierde datos.
- **Alta:** la mayoría la completa con ayuda o con mucha demora.
- **Media:** molesta, pero se resuelve sola.
- **Baja:** detalle visual o de texto.

Las críticas y altas se corrigen antes del lanzamiento; el resto pasa al plan de mejoras.

---

## 7. Criterio para lanzar

- Cada tarea crítica la completa sola al menos el 80 % de las personas.
- No quedan hallazgos críticos abiertos.
- SUS promedio de 68 o más.
- Los recordatorios llegan a la bandeja de entrada (no a spam) en Gmail y Outlook.
