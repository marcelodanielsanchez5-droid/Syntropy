# Syntropy — Sistema de diseño

**Fase:** 1 — Diseño  
**Estado:** propuesta para aprobación  
**Archivo visual:** [`presentacion.html`](./presentacion.html)

---

## 1. Concepto

Syntropy debe sentirse como una **herramienta académica con lenguaje de progresión**, no como un videojuego infantil.

La identidad combina:

- una base oscura, ordenada y de alto contraste;
- rosa y morado como acentos de energía;
- tarjetas y carpetas con esquinas suaves;
- una grilla sutil que evoca circuitos y planos;
- nodos, conexiones y contornos metálicos como lenguaje de progreso;
- tipografía sans-serif, clara y con jerarquía fuerte.

### Regla de oro

> El 90 % de la interfaz debe ser legible y tranquila. El 10 % restante puede ser neón.

El rosa y el morado se usan en acciones, estados activos, nodos y detalles. No se usan como fondo de grandes áreas de lectura.

---

## 2. Logo

### 2.1. Símbolo

- Cerebro frontal de dos hemisferios.
- Circuitos que terminan en nodos.
- Hemisferio izquierdo rosa (#E01462 a #FF478D).
- Hemisferio derecho morado (#6F07C8 a #8B18D9).
- Nodo central magenta (#CA01CC).
- Versión monocroma para fondos oscuros y para el ícono de la app.

### 2.2. Uso

| Versión | Uso |
|---|---|
| Color | Login, registro, presentaciones, marketing |
| Monocromo claro | Barra superior de la app, fondos oscuros |
| Ícono cuadrado | PWA, Windows, Android, iOS |

### 2.3. Área de respeto

- Dejar libre alrededor del logo el equivalente a la altura del nodo central.
- No deformar, rotar ni aplicar sombras duras.
- No cambiar los colores de los hemisferios.
- No usar el símbolo como fondo de texto.
- Tamaño mínimo del símbolo: 24 px en interfaz; 64 px en login.
- Tamaño mínimo del lockup horizontal: 160 px de ancho.

### 2.4. Estado

La versión actual en `docs/assets/` es **provisional y vectorial**. Respeta la dirección del documento maestro, pero el trazo del cerebro debe refinarse con el usuario o con un diseñador antes de la publicación. No se debe declarar como logo final todavía.

---

## 3. Tipografía

### 3.1. Familia

**Inter Variable** para toda la interfaz.

- Moderna, legible, con buen rendimiento.
- Disponible en pesos 400 a 800.
- Se sirve localmente desde `docs/assets/Inter-Variable.woff2` durante el diseño; en la app se instalará como recurso propio.
- El logotipo puede usar una versión geométrica personalizada en el futuro; por ahora usa Inter 800 con degradado.

### 3.2. Escala

| Token | Escritorio | Móvil | Peso | Uso |
|---|---|---|---|---|
| `display-lg` | 48/56 | 36/44 | 800 | Portada, bienvenida |
| `display` | 40/48 | 32/40 | 800 | Título de acceso |
| `h1` | 32/40 | 28/36 | 700 | Título de sección |
| `h2` | 24/32 | 22/30 | 700 | Título de panel |
| `h3` | 20/28 | 18/26 | 600 | Título de tarjeta |
| `body-lg` | 18/28 | 17/26 | 400 | Texto destacado |
| `body` | 16/24 | 16/24 | 400 | Texto general |
| `body-sm` | 14/20 | 14/20 | 400 | Ayudas, metadatos |
| `caption` | 12/16 | 12/16 | 500 | Etiquetas, fechas |
| `overline` | 11/16 | 11/16 | 600 | Categorías, mayúsculas |

### 3.3. Reglas

- Títulos con `letter-spacing: -0.02em`.
- Texto corrido sin tracking negativo.
- No usar menos de 12 px en texto informativo.
- No usar mayúsculas sostenidas en párrafos.
- Números de notas con `font-variant-numeric: tabular-nums`.
- Longitud de línea recomendada: 60–75 caracteres.

---

## 4. Paleta

### 4.1. Tokens de marca

| Token | Hex | Uso |
|---|---|---|
| `brand-purple-700` | `#6F07C8` | Hemisferio derecho, acentos profundos |
| `brand-purple-500` | `#8B18D9` | Degradados, nodos |
| `brand-magenta` | `#CA01CC` | Nodo central, detalles |
| `brand-fuchsia` | `#9A15AF` | Transición del degradado |
| `brand-rose-600` | `#E01462` | Hemisferio izquierdo, botón primario |
| `brand-rose-500` | `#FF478D` | Enlaces, acentos, nodos secundarios |
| `brand-navy` | `#1C1951` | Títulos sobre fondo claro |
| `brand-yellow` | `#FFDE00` | Identificación de asignaturas |

### 4.2. Tokens de interfaz oscura

| Token | Hex | Uso |
|---|---|---|
| `bg-canvas` | `#0C141F` | Fondo principal |
| `bg-shell` | `#161E2B` | Barra superior y menú lateral |
| `bg-surface` | `#29313C` | Tarjetas, celdas, paneles |
| `bg-sunken` | `#121A27` | Paneles secundarios, filtros |
| `border` | `#2F3947` | Bordes sutiles |
| `border-strong` | `#465264` | Bordes de foco secundario |
| `graph-line` | `#7D8592` | Conexiones de nodos |
| `text-primary` | `#FFFFFF` | Títulos y texto principal |
| `text-secondary` | `#C7CED8` | Texto de apoyo |
| `text-muted` | `#98A2B3` | Metadatos |
| `text-disabled` | `#6B7687` | Deshabilitado |

### 4.3. Tokens semánticos

| Token | Hex | Uso |
|---|---|---|
| `success` | `#5DD6A2` | Terminada, aprobado |
| `success-bg` | `#12352B` | Fondo de éxito |
| `warning` | `#FFC857` | En espera, atención |
| `warning-bg` | `#3A2C12` | Fondo de advertencia |
| `danger` | `#FF6B8A` | Error, atrasada, eliminar |
| `danger-bg` | `#3A1720` | Fondo de error |
| `info` | `#8AB4FF` | Pendiente, información |
| `info-bg` | `#16243D` | Fondo informativo |

### 4.4. Contraste comprobado

| Combinación | Ratio | Cumple |
|---|---:|---|
| Blanco sobre `#0C141F` | 18,49:1 | AAA |
| Blanco sobre `#161E2B` | 16,74:1 | AAA |
| Blanco sobre `#29313C` | 13,13:1 | AAA |
| `#C7CED8` sobre `#29313C` | 8,29:1 | AAA |
| `#98A2B3` sobre `#29313C` | 5,10:1 | AA |
| `#FF478D` sobre `#0C141F` | 5,76:1 | AA |
| `#E01462` sobre `#0C141F` | 3,92:1 | Solo texto grande / no texto |
| Blanco sobre `#E01462` | 4,72:1 | AA |
| `#FFDE00` sobre `#0C141F` | 13,83:1 | AAA |
| `#1C1951` sobre `#FF478D` | 5,00:1 | AA |

**Reglas:**

- El botón primario usa fondo `#E01462` con texto blanco.
- `#FF478D` se usa como acento sobre fondos muy oscuros; no como texto pequeño sobre `#29313C` (4,09:1, insuficiente).
- Para texto de acento sobre tarjetas usar `#FFB3CD` (7,87:1 sobre `#29313C`).
- El amarillo no se usa como color de texto sobre blanco.
- El color nunca es el único indicador de estado.

### 4.5. Colores de asignatura

Paleta de 12 colores, seleccionables:

| Nombre | Hex |
|---|---|
| Rosa | `#E01462` |
| Fucsia | `#FF478D` |
| Morado | `#6F07C8` |
| Violeta | `#9A15AF` |
| Azul | `#2F6BFF` |
| Celeste | `#22B8CF` |
| Turquesa | `#12B886` |
| Verde | `#37B24D` |
| Lima | `#94D82D` |
| Amarillo | `#FFDE00` |
| Naranja | `#FF922B` |
| Rojo | `#FA5252` |

**Uso:**

- Carpeta de asignatura.
- Barra lateral de tarjetas de tarea.
- Punto/evento del calendario.
- Relleno base de nodos.
- Borde superior de tarjetas de biblioteca.

**No usar:**

- Como fondo de párrafos largos.
- Como color de texto pequeño sin comprobar contraste.
- Para indicar estado (Pendiente / En espera / Terminada); los estados tienen su propia semántica.

### 4.6. Contornos de nodo

| Nivel | Porcentaje | Color / tratamiento |
|---|---|---|
| Blanco | 0–29 % | `#F8FAFC` |
| Bronce | 30–49 % | `#B87333` |
| Plata | 50–69 % | `#C0C7D1` |
| Oro | 70–89 % | `#F5C542` |
| Diamante | 90–99 % | `#7FE7FF` |
| Multicolor | 100 % | Degradado cónico rosa-morado-cyan-amarillo |
| Sin calificar | — | Línea discontinua `#7D8592` |

El contorno se dibuja **fuera del nodo**, con una separación de 3 px respecto al relleno. No se usa como borde interior.

### 4.7. Colores de estado de tarea

| Estado | Color | Fondo | Ícono |
|---|---|---|---|
| Pendiente | `#8AB4FF` | `#16243D` | círculo vacío |
| En espera | `#FFC857` | `#3A2C12` | reloj / pausa |
| Terminada | `#5DD6A2` | `#12352B` | check |
| Atrasada | `#FF6B8A` | `#3A1720` | alerta |

La etiqueta textual siempre acompaña al color.

---

## 5. Espaciado, radios y sombras

### 5.1. Espaciado

Base de 4 px:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`

### 5.2. Radios

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 8 px | etiquetas, chips |
| `radius-md` | 12 px | inputs, botones |
| `radius-lg` | 16 px | tarjetas |
| `radius-xl` | 24 px | paneles, carpetas |
| `radius-full` | 999 px | avatares, píldoras |

### 5.3. Sombras

- `shadow-sm`: `0 1px 2px rgba(0,0,0,.25)`
- `shadow-md`: `0 8px 24px rgba(0,0,0,.28)`
- `shadow-lg`: `0 24px 64px rgba(0,0,0,.36)`
- En tema oscuro, preferir bordes y cambios de superficie antes que sombras grandes.
- El resplandor neón se usa solo en nodos y detalles, no en tarjetas completas.

---

## 6. Layout

### 6.1. Escritorio

- Barra superior: 64 px.
- Barra lateral: 84 px colapsada / 240 px expandida.
- Panel derecho: 360 px.
- Padding de contenido: 24 px (tablet) / 32 px (desktop).
- Ancho máximo de lectura: 760 px.
- Ancho máximo de tablero: 1600 px.

### 6.2. Móvil

- Padding lateral: 16 px.
- Área táctil mínima: 44 × 44 px.
- Botón principal: 48 px de alto.
- Barra inferior: 64 px + safe area.
- Formularios a ancho completo.
- Tablas se convierten en tarjetas.

### 6.3. Breakpoints

| Nombre | Ancho |
|---|---|
| `sm` | 640 px |
| `md` | 768 px |
| `lg` | 1024 px |
| `xl` | 1280 px |
| `2xl` | 1536 px |

---

## 7. Componentes

### 7.1. Botones

| Variante | Fondo | Texto | Uso |
|---|---|---|---|
| Primario | `#E01462` | Blanco | Acción principal |
| Primario hover | `#B30E4B` | Blanco | — |
| Secundario | `#29313C` | Blanco | Acción alternativa |
| Fantasma | Transparente | `#C7CED8` | Acciones terciarias |
| Peligro | `#FF6B8A` | `#1C0A10` | Eliminar |
| Deshabilitado | `#242C38` | `#6B7687` | Sin acción |

- Altura: 40 px escritorio, 48 px móvil.
- Radio: 12 px.
- Icono + texto con separación de 8 px.
- Estado de carga: spinner + texto “Guardando…”.
- Foco: anillo de 2 px `#FF478D` con offset de 2 px.

### 7.2. Campos

- Etiqueta arriba, 600, 14 px.
- Altura: 44 px escritorio, 48 px móvil.
- Fondo: `#121A27`.
- Borde: 1 px `#2F3947`.
- Texto: blanco.
- Placeholder: `#7D8592`.
- Foco: borde `#FF478D` + anillo suave.
- Error: borde `#FF6B8A`, mensaje debajo con ícono.
- Ayuda: 12–14 px, `#98A2B3`.
- Nunca usar el placeholder como etiqueta.
- Selects nativos estilizados o Radix Select.
- Fechas: input nativo con formato local, y selector de calendario en escritorio.

### 7.3. Tarjetas

- Fondo `#29313C`.
- Borde 1 px `#2F3947`.
- Radio 16–24 px.
- Padding 16–24 px.
- Título 18–20 px, peso 600.
- Acción en la esquina superior derecha.
- No anidar más de dos niveles de tarjetas.

### 7.4. Carpetas de asignatura

- Forma de carpeta con pestaña.
- Color de asignatura como relleno principal.
- Nombre debajo o dentro, con contraste.
- Próximo vencimiento como texto secundario.
- Menú contextual de tres puntos.
- Estado hover: elevación sutil y borde claro.
- Estado seleccionado: anillo de 2 px.

### 7.5. Tarjetas de tarea

- Barra vertical de 4 px con el color de la asignatura o color propio.
- Título en 16 px, peso 600.
- Asignatura en 12 px con punto de color.
- Fecha límite y cuenta regresiva.
- Chip de estado con ícono.
- Acciones: editar, eliminar, cambiar estado.
- En el panel derecho: ancho completo, padding 16 px.
- En móvil: mismo contenido en una sola columna.

### 7.6. Eventos de calendario

- Tarea: barra/punto de color + título + hora.
- Examen: ícono de examen + color de asignatura + título.
- Estudio: fondo tenue, borde punteado, etiqueta “Estudio”.
- Día actual: fondo `#1A2433`, borde rosa.
- Día seleccionado: anillo rosa.
- Día con muchas tareas: “+N”.
- La cuenta regresiva se muestra en la tarjeta, no dentro de la celda, para no saturar.

### 7.7. Chips y badges

- Altura 24–28 px.
- Radio full.
- Icono opcional de 14 px.
- Nunca solo color: incluir texto.

### 7.8. Diálogos

- Escritorio: ancho 560 px, máximo 720 px.
- Fondo `#161E2B`, borde `#2F3947`, radio 24 px.
- Título 24 px.
- Cierre con `X` y `Esc`.
- Foco atrapado.
- En móvil: hoja desde abajo, radio superior 24 px, arrastre para cerrar.

### 7.9. Navegación

- Ítem activo: barra rosa de 3 px, fondo `#1E2735`, texto blanco.
- Ítem inactivo: `#98A2B3`.
- Hover: fondo `#1B2431`, texto `#E8EDF5`.
- Barra inferior móvil: 5 destinos, ícono 22 px, etiqueta 11 px.
- No usar más de 5 destinos en la barra inferior.

### 7.10. Tablas

- Cabecera con fondo `#121A27`, texto 12 px mayúsculas.
- Filas con borde inferior `#2F3947`.
- Números alineados a la derecha.
- En móvil: tarjetas con pares etiqueta-valor.
- No usar tablas de más de 5 columnas en móvil.

### 7.11. Estados vacíos

- Ilustración lineal simple (carpeta, calendario, nodo).
- Título 18–20 px.
- Texto de 1–2 líneas.
- Acción principal.
- Nunca dejar una pantalla completamente vacía sin explicación.

### 7.12. Skeletons

- Forma del contenido real.
- Animación de opacidad suave.
- Respetar `prefers-reduced-motion`.
- No usar spinner global salvo en el arranque de sesión.

---

## 8. Reglas visuales de los nodos

### 8.1. Forma según dificultad

| Dificultad | Forma | Lados |
|---|---|---|
| 1–2 | Círculo | 0 |
| 3 | Triángulo | 3 |
| 4 | Cuadrado | 4 |
| 5 | Pentágono | 5 |
| 6 | Hexágono | 6 |
| 7 | Heptágono | 7 |
| 8 | Octógono | 8 |
| 9–10 | Eneágono | 9 |

### 8.2. Tamaño

- Nodo raíz: 88–96 px.
- Tema principal: 64–72 px.
- Tema secundario: 52–60 px.
- Tema terciario: 44–52 px.
- El tamaño no debe ser el único indicador de jerarquía; también hay posición y conexión.

### 8.3. Relleno según dominio

- El color base es el de la asignatura.
- La intensidad aumenta con el dominio de 1 a 10.
- Fórmula propuesta: `opacidad = 0.18 + (dominio - 1) * 0.08` → 0,18 a 0,90.
- Sobre fondo oscuro, el nodo se mezcla con `#121A27`.
- El texto del nodo debe mantener contraste; si el relleno es muy claro, usar texto oscuro o una etiqueta externa.
- El dominio se muestra también en el panel de detalle con barra y número.

### 8.4. Contorno según notas

- Se calcula el porcentaje de cada nota: `(nota - mínimo) / (máximo - mínimo) * 100`.
- Si hay varias notas vinculadas, se promedian los porcentajes (promedio simple, según el documento).
- El contorno se dibuja con 2,5 px de grosor, separado 3 px del relleno.
- Sin notas: contorno discontinuo gris, no blanco.
- El nivel se muestra en el panel de detalle: “Plata · 64 %”.
- No confundir el amarillo de una asignatura con el oro del contorno: el contorno siempre está separado y tiene leyenda.
- Multicolor: degradado cónico con al menos cuatro colores, animado solo si el usuario no pidió movimiento reducido.

### 8.5. Conexiones

- Jerárquicas: línea gris `#7D8592`, 1,5 px, ángulos rectos con radio de 8 px.
- Entre asignaturas: línea punteada, 1,5 px, con etiqueta opcional.
- Al seleccionar un nodo, sus conexiones se resaltan.
- No usar flechas en el árbol jerárquico salvo que la dirección sea necesaria; la posición padre-hijo ya la comunica.
- En el plano general, las conexiones entre asignaturas usan el color de la asignatura de origen con opacidad.

### 8.6. Nodo raíz

Propuesta: contenedor de asignatura, no tema evaluable.

- Forma hexagonal grande.
- Color de la asignatura.
- Nombre de la asignatura.
- Sin dificultad, sin dominio y sin contorno metálico.
- No cuenta para el promedio de la asignatura.
- Se conecta a los temas principales.
- En el plano general, es el ancla de la asignatura.

Pendiente de aprobación (D5).

### 8.7. Interacción

- Zoom con rueda, pellizco o botones.
- Paneo con arrastre.
- Nodo arrastrable; la posición se guarda.
- Tocar/click abre el panel de detalle.
- “Ajustar” encuadra todo el árbol.
- “Centrar” vuelve al nodo raíz.
- En móvil, los controles son de 44 px.
- El modo “mover” y el modo “seleccionar” deben ser claros para evitar arrastres accidentales.

---

## 9. Iconografía

- Lucide, trazo de 1,8–2 px.
- Tamaños: 16, 20, 24 y 32 px.
- No mezclar familias de iconos.
- Íconos de la barra lateral:
  - Inicio: casa
  - Calendario: calendario
  - Horario: reloj
  - Calificaciones: libreta con lápiz
  - Nodos: red de nodos
  - Biblioteca: libros
  - Configuración: engranaje
- Los iconos inactivos no deben bajar de 3:1 de contraste.
- Todo icono con acción tiene etiqueta accesible o tooltip.

---

## 10. Movimiento

- Duración: 120 ms para hover, 180 ms para paneles, 240 ms para diálogos.
- Curva: `cubic-bezier(0.2, 0, 0, 1)`.
- No animar más de 2 propiedades a la vez.
- Respetar `prefers-reduced-motion`.
- El resplandor de nodos no debe parpadear.
- Sin animaciones de carga infinitas en el contenido principal.

---

## 11. Accesibilidad

### 11.1. Contraste

- Texto normal: mínimo 4,5:1.
- Texto grande: mínimo 3:1.
- Componentes e iconos: mínimo 3:1.
- No usar el color como único medio para transmitir estado, dificultad, dominio o nivel de nota.

### 11.2. Teclado

- Todo control es alcanzable con Tab.
- Orden de foco lógico.
- Foco visible en todos los elementos.
- `Esc` cierra diálogos y menús.
- `Enter` y `Espacio` activan botones.
- No atrapar el foco fuera de un diálogo.

### 11.3. Táctil

- Área mínima 44 × 44 px.
- Separación mínima de 8 px entre acciones.
- No depender de hover.
- Acciones destructivas con confirmación.
- Gestos con alternativa visible (zoom, ajustar).

### 11.4. Lectores de pantalla

- Etiquetas `aria-label` en botones de icono.
- `aria-live` para avisos de guardado y errores.
- Tablas con encabezados semánticos.
- Calendario con texto alternativo por día.
- Nodos con nombre, dificultad, dominio y nivel de nota en el panel de detalle.

### 11.5. Movimiento y tamaño

- Respetar zoom del navegador hasta 200 %.
- No bloquear la orientación.
- Texto escalable.
- Evitar texto dentro de imágenes.

### 11.6. Lenguaje

- Español claro, sin tecnicismos innecesarios.
- Mensajes de error que explican qué pasó y qué hacer.
- “Guardar cambios”, no “Submit”.
- “Eliminar asignatura”, no “Borrar entidad”.

---

## 12. Tema claro

El MVP será **solo oscuro**. El sistema de tokens permite añadir un tema claro en el futuro, pero no se implementará ahora. Razones:

- la identidad visual aprobada es oscura;
- duplicar el tema aumenta el trabajo de QA;
- los nodos y el calendario necesitan una segunda pasada de contraste.

Si el usuario pide tema claro, se evaluará como fase posterior.

---

## 13. Archivos de referencia

- `docs/assets/logo-mark.svg`
- `docs/assets/logo-mark-mono.svg`
- `docs/assets/logo-lockup.svg`
- `docs/assets/app-icon.svg`
- `docs/assets/Inter-Variable.woff2`

La presentación visual muestra los tokens, componentes y estados principales.

---

## 14. Decisiones pendientes

- **D1:** Tauri vs PWA para Windows.
- **D5:** nodo raíz.
- **D9:** caché offline y privacidad.
- **D10:** logo definitivo.
- **D13:** tema claro.
- **D14:** nombre de la tipografía definitiva si se cambia Inter.
