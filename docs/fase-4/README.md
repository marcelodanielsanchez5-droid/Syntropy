# Fase 4 — Horario y calificaciones

**Estado:** implementada el 13 de noviembre de 2026. Probada con pruebas automáticas, en el navegador contra una base PostgreSQL local y, el 13 de noviembre de 2026, contra el proyecto real de Supabase (horario, escala de calificaciones, notas y aislamiento A/B; ver [`docs/fase-8/04-validacion-real.md`](../fase-8/04-validacion-real.md)). **Falta la aprobación explícita del usuario.** Con esta fase queda completo el MVP (fases 2, 3 y 4).

**Alcance (documento maestro):** horario semanal con materias, descansos y actividades secundarias; tabla de notas con promedio automático y nota necesaria para aprobar; reglas de calificación configurables.

No hizo falta cambiar la base: `schedule_entries`, `assessments` y `grading_settings` existen desde la migración 001.

---

## 1. Horario (`/horario`)

- **Semana:** grilla de lunes a viernes (sábado y domingo aparecen si tienen bloques), de 7 a 18 h o más si hace falta. Los bloques que se superponen se ven uno al lado del otro. Una línea marca la hora actual.
- **Día:** agenda de un día con selector; en el celular es la vista inicial.
- **Hoy:** panel con los bloques del día, «Ahora» en el que está en curso y «Sigue» en el próximo.
- **Bloques:** clase (exige asignatura), descanso, actividad u otro. Al crear se pueden elegir varios días y se guarda un bloque por día. Tocar un hueco de la grilla abre el alta a esa hora. Aviso si se superpone con otro bloque (se puede guardar igual).
- **Colores:** las clases usan el color de su materia; los descansos, borde punteado gris; las actividades sin materia, violeta. El modelo no guarda un color propio para los bloques.
- **Integración:** el inicio muestra «Hoy» con el horario del día y la pestaña Información de cada materia muestra su horario semanal.

## 2. Calificaciones (`/calificaciones` y `/asignaturas/:id/calificaciones`)

- **Resumen por materia:** promedio y estado (Aprobando / Por debajo / Sin notas) de todas las materias del año.
- **Tabla de evaluaciones:** nombre, fecha, nota (o «Pendiente»), peso con su peso efectivo en % y aporte. En el celular se ve como tarjetas.
- **Promedio:** ponderado, en la escala actual, con barra y marca de aprobación.
- **¿Qué necesito?:** nota necesaria en la próxima evaluación pendiente, con los mensajes del documento: asegurada, necesaria, imposible o sin evaluaciones pendientes.
- **Escala:** mínimo, máximo, nota para aprobar y decimales, con escalas frecuentes de un toque. Se configura desde Calificaciones o Configuración. Mientras no se confirma, se muestra un aviso.
- **Notas con coma:** se aceptan «7,5» y «7.5».

### 2.1. Reglas implementadas (modelo de datos, sección 5)

- Cada evaluación guarda una copia de la escala al crearse (D4); cambiar la escala global no reinterpreta notas viejas y la tabla indica la escala original cuando difiere.
- Pesos relativos (D3): se normalizan sobre el total y se avisa si no suman 100.
- Solo cuentan para el promedio las evaluaciones con nota; la próxima evaluación es la pendiente con fecha más cercana (las sin fecha van al final).
- Se redondea solo para mostrar. El estado de aprobación se decide con el valor redondeado que ve el usuario.

---

## 3. Pruebas

- **Automáticas:** casos obligatorios 1 a 9 de la sección 5.4 (el 10, nodo con notas de escalas distintas, corresponde a la Fase 5), formularios de notas y escala, grilla semanal (columnas, horas y días visibles), estado del día, superposiciones, zona horaria y formulario de bloques.
- **Navegador:** horario semanal y diario, alta de bloques en dos días con aviso de superposición y columnas lado a lado, resumen de notas, tabla, carga de una nota con coma, proyección recalculada y cambio de escala de 1–10 a 0–20. En el celular se encontró y corrigió un desborde horizontal de las grillas de dos columnas.

### Limitaciones

- La validación real del 13/11/2026 cubrió horario, escala y notas en Supabase, con aislamiento A/B. No se probó con muchas materias ni en Safari/Firefox.
- No hay feriados ni clases canceladas por fecha (fuera del MVP según el modelo).
- No hay escala por asignatura ni categorías de pesos (fuera del MVP, D3 y D4).
