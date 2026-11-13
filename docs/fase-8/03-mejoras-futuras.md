# Fase 8 · Plan de mejoras futuras

El documento maestro deja para después del lanzamiento la gamificación (**logros, niveles y puntos de experiencia**) y la edición sin conexión. Este plan propone cómo hacerlas y ordena el resto de los pendientes. Las prioridades se ajustan con lo que salga de las pruebas con estudiantes.

---

## 1. Gamificación: logros, niveles y experiencia

### 1.1. Principios

- **Opcional:** se puede apagar en Configuración, y apagada no se ve nada.
- **Sin comparación:** sin rankings ni perfiles públicos. Hay menores de edad y los datos académicos son sensibles.
- **Premia hábitos, no notas:** se gana experiencia por organizarse y estudiar, nunca por la calificación obtenida.
- **No castiga:** no se pierden puntos ni niveles; las rachas se pueden pausar en vacaciones.
- **Sin trampas fáciles:** marcar y desmarcar una tarea no suma dos veces.

### 1.2. Experiencia (XP) y niveles

| Acción | XP | Límite |
|---|---|---|
| Terminar una tarea antes de que venza | 10 | Una vez por tarea |
| Terminar un proyecto antes de que venza | 25 | Una vez por proyecto |
| Completar una sesión de estudio | 5 | Una vez por sesión |
| Llegar a un examen con todo el plan de estudio cumplido | 30 | Una vez por examen |
| Agregar un tema al mapa con resumen | 3 | 10 por día |
| Agregar una fuente asociada a un tema | 2 | 10 por día |

Nivel `n` a partir de `50 × n × (n − 1)` XP (nivel 2 con 100, nivel 3 con 300, nivel 4 con 600…): sube rápido al principio y después se estabiliza.

### 1.3. Logros

| Logro | Condición |
|---|---|
| Primeros pasos | Primer año de curso con tres asignaturas |
| Semana armada | Horario con al menos 10 bloques |
| A tiempo | 10 tareas terminadas antes del vencimiento |
| Constancia | 5 sesiones de estudio en una misma semana |
| Plan cumplido | Un examen con el 100 % de las sesiones completadas |
| Cartógrafo | 15 temas en el mapa de una asignatura |
| Bibliotecario | 20 fuentes asociadas a temas |
| Racha de estudio | 7 días seguidos con alguna sesión completada (se pausa en vacaciones) |

### 1.4. Diseño técnico

- Tabla `xp_events (user_id, kind, ref_id, points, created_at)` con clave única `(user_id, kind, ref_id)`: cada tarea, sesión o examen suma una sola vez aunque se marque y desmarque.
- Los eventos los crean **disparadores en la base** (como los recordatorios de la Fase 7), no el cliente, para que no se puedan inventar puntos desde la API. El cliente solo lee.
- Tabla `achievements (user_id, code, unlocked_at)`; los logros se evalúan en el mismo disparador.
- Nivel y total se calculan con una vista o una función, sin guardarlos aparte.
- En la interfaz: nivel y barra de progreso en el inicio, una pestaña de logros en el perfil y un aviso discreto al desbloquear algo. El estilo «videojuego» de la identidad visual (contornos metálicos de los nodos) ya da el lenguaje visual.
- Actualizar la política de privacidad (se tratan datos nuevos derivados del uso) y subir su versión.

Esfuerzo estimado: una fase del tamaño de la 6.

---

## 2. Otros pendientes

| Mejora | Por qué | Esfuerzo |
|---|---|---|
| Edición sin conexión | Hoy sin conexión solo se puede leer. Necesita cola de cambios y resolución de conflictos. | Alto |
| Notificaciones push (PWA) | Complementan los correos, sobre todo en el celular. | Medio |
| Dirección alternativa para los recordatorios, con verificación | Hoy solo se envían al correo de la cuenta (D28). | Bajo |
| Aviso en la app de los correos enviados | La campana solo muestra vencimientos. | Bajo |
| Exportar el calendario (iCal) | Para verlo en Google Calendar o en el celular. | Medio |
| Miniaturas de PDF y reemplazo del archivo de una fuente | Hoy se muestra el ícono y para cambiar el archivo hay que borrar la fuente. | Medio |
| Escala de calificaciones por asignatura | Hoy la escala es una sola por usuario. | Medio |
| Archivo histórico de asignaturas (D11) | Borrar es definitivo; archivar permitiría consultar años anteriores. | Medio |
| Tema claro | Los tokens de color ya están preparados. | Bajo |
| Reducir más la carga inicial | El cliente de Supabase trae el módulo de tiempo real (~56 kB), que la app no usa. | Bajo |
| Pruebas de punta a punta (Playwright) | Hoy las pruebas de navegador se hacen a mano. | Medio |
| Control exacto del espacio de la biblioteca | El tamaño lo declara el cliente; una Edge Function podría leerlo de Storage. | Bajo |
| Empaquetado para Windows, Android e iOS | Tauri y Capacitor (documento maestro). | Alto |

---

## 3. Orden propuesto

1. Lo que salga de las pruebas con estudiantes (siempre primero).
2. Notificaciones push y aviso en la app de los correos: completan los recordatorios de la Fase 7 con poco esfuerzo.
3. Gamificación (sección 1).
4. Edición sin conexión.
5. Tiendas de aplicaciones.
