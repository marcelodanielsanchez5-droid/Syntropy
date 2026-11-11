# Syntropy — Decisiones aprobadas

**Fase:** 1 — Diseño  
**Estado:** aprobada por el usuario  
**Fecha de aprobación:** 10 de noviembre de 2026  
**Respuesta registrada:** «Apruebo todas las recomendaciones».

---

## 1. Registro de aprobación

La Fase 1 queda cerrada. Se aprueban las recomendaciones D1–D25 tal como fueron presentadas, con las consecuencias técnicas que se resumen en este documento.

Las decisiones bloqueantes —D1, D2, D3, D4, D8, D9 y D12— quedan resueltas. D5 se aplicará en la Fase 5 y D10 antes de publicar.

---

## 2. Decisiones bloqueantes resueltas

### D1. Empaquetado de Windows

**Aprobado:** PWA + Tauri 2.

- La web se publica como PWA instalable.
- Tauri 2 envuelve el mismo build; no se duplica la aplicación.
- Tauri se integra cuando la versión web esté estable. No se instala Rust antes de ese hito.
- El instalador de Windows se firmará cuando existan usuarios reales (D17).

### D2. Año de curso

**Aprobado:** nombre libre + fechas.

- `academic_years` usa `name`, `starts_on`, `ends_on` e `is_active`.
- El nombre puede ser «5.º año · 2026», «Universidad 2026» o «2026».
- Solo puede existir un año activo por usuario.
- El año activo es el contexto visible de la aplicación.

### D3. Ponderaciones

**Aprobado:** peso directo por evaluación.

- Cada evaluación tiene un peso relativo (`weight > 0`).
- Los pesos se normalizan sobre el total de evaluaciones de la asignatura.
- No hay categorías con pesos en el MVP.
- La UI debe mostrar el peso efectivo y advertir si la suma no es 100 %.

### D4. Escala de calificaciones

**Aprobado:** escala global + copia por evaluación.

- `grading_settings` guarda la escala global del usuario.
- Cada evaluación guarda `scale_min` y `scale_max` al crearse.
- Cambiar la escala global no reinterpreta notas históricas.
- La escala por asignatura queda fuera del MVP.

### D8. Edad mínima y consentimiento

**Aprobado:** 13+ con aceptación explícita.

- El registro exige confirmar que el usuario tiene 13 años o más.
- Se registran la aceptación de términos, la aceptación de privacidad y la confirmación de edad con fecha.
- No se solicita fecha de nacimiento en el MVP.
- Debe existir política de privacidad, términos y eliminación de cuenta.
- Antes de publicar, revisar el texto legal con un profesional de la jurisdicción del usuario.

### D9. Caché offline

**Aprobado:** datos por usuario en IndexedDB.

- La caché se separa por `user_id`.
- Se limpia al cerrar sesión.
- Caduca a las 24 horas.
- No se cachean respuestas de Supabase en el service worker.
- Se muestra un aviso de privacidad en dispositivos compartidos.
- La bóveda cifrada local queda para una versión posterior.

### D12. Identidad técnica

**Aprobado:** `com.syntropy.app`, versión `0.1.0`, esquema futuro `syntropy://`.

---

## 3. Resto de decisiones aprobadas

| ID | Tema | Decisión final |
|---|---|---|
| D5 | Nodo raíz | Contenedor de asignatura, sin dificultad, dominio ni contorno metálico. Los temas hijos son los evaluables. Se implementa en la Fase 5. |
| D6 | Campana | Panel de próximos vencimientos calculado con tareas y exámenes. No se guardan notificaciones. |
| D7 | Biblioteca | Asignatura obligatoria; nodo opcional con «Sin tema». Se ajustará el modelo antes de la Fase 6. |
| D10 | Logo | Se aprueba la dirección provisional y se refina antes de publicar. El logo actual no es definitivo. |
| D11 | Borrado de asignaturas | Definitivo, con confirmación y advertencia de cascada. El archivo histórico queda para después. |
| D13 | Tema | Solo oscuro en el MVP; tokens preparados para tema claro. |
| D14 | Tipografía | Inter Variable. |
| D15 | iOS | Después de validar web, Windows y Android; compilación en macOS o CI. |
| D16 | Enlaces de correo | Abren la web para confirmar o restablecer; la app se abre después. |
| D17 | Firma Windows | Sin firma en el MVP; se firma cuando haya usuarios. |
| D18 | Hosting web | Vercel; cambiable sin tocar el código. |
| D19 | Sobre en la barra | Se elimina; el correo se configura en preferencias. |
| D20 | Docentes | Arreglo de nombres en `subjects`; sin tabla de docentes en el MVP. |
| D21 | Calendario general | Tareas y exámenes; sin sesiones de estudio. |
| D22 | Semana | Lunes a domingo, sin configuración. |
| D23 | Notificaciones push | Fuera del MVP. |
| D24 | Edición offline | Fuera del MVP. |
| D25 | Puntos, niveles y rachas | Fuera del MVP. |

---

## 4. Consecuencias en el modelo de datos

La migración `001_schema_inicial.sql` refleja D2, D3, D4 y D5. La migración `002_ajustes_fase2.sql` aplica D7 y D8:

1. `sources.node_id` admite `NULL` para representar «Sin tema» (D7).
2. `profiles` guarda la aceptación de términos, la aceptación de privacidad y la confirmación de edad (D8).
3. El trigger de alta copia esas aceptaciones desde los metadatos del registro.
4. La restricción `profiles_consents_all_or_none` exige que los tres consentimientos estén todos presentes o todos ausentes.
5. La app impide el registro sin las tres confirmaciones, aunque el trigger mantenga valores nulos para usuarios creados por otros medios.
6. Se agregan las funciones `activate_academic_year` y `delete_current_user`.

La migración 002 fue validada localmente con PGlite el 10 de noviembre de 2026. **Todavía no se ejecutó en un proyecto real de Supabase**; el detalle está en [`06-modelo-datos.md`](./06-modelo-datos.md), sección 14.

---

## 5. Checklist de aprobación de Fase 1

- [x] D1 resuelta: PWA + Tauri 2.
- [x] D2 resuelta: nombre libre + fechas.
- [x] D3 resuelta: pesos directos por evaluación.
- [x] D4 resuelta: escala global + copia por evaluación.
- [x] D8 resuelta: 13+ con aceptación explícita.
- [x] D9 resuelta: caché por usuario en IndexedDB.
- [x] D12 resuelta: `com.syntropy.app`, versión `0.1.0`.
- [x] Logo aprobado en dirección; refinamiento pendiente antes de publicar.
- [x] Mapa de navegación aprobado.
- [x] Wireframes aprobados.
- [x] Sistema de diseño aprobado.
- [x] Modelo de datos aprobado.

---

## 6. Estado siguiente

La Fase 2 quedó implementada localmente en el cliente:

1. autenticación con Supabase Auth;
2. perfil, avatar y cambio de contraseña;
3. años de curso con activación transaccional;
4. asignaturas con docentes, color y textos;
5. consentimientos D8 y nodo opcional D7 en la migración 002;
6. pruebas unitarias, typecheck y build aprobados.

Falta el paso decisivo: crear el proyecto real de Supabase, aplicar 001 y 002, configurar `.env.local` y probar los flujos completos. Hasta entonces, la Fase 2 no se declara aprobada. El detalle de validación está en [`06-modelo-datos.md`](./06-modelo-datos.md), sección 14.
