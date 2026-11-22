# Sistema de diseño

La dirección de la interfaz es un **diario editorial de datos**: papel cálido en modo
claro, azul tinta en modo oscuro, Fraunces solo para los títulos de página y el logotipo
de texto, Inter para todo lo demás y JetBrains Mono para los códigos. El amarillo de la
bandera ecuatoriana aparece solo como una pequeña marca de acento, nunca como texto ni como
serie de un gráfico.

Los valores vinculantes viven en `src/ui/design/tokens.css`; el contrato de contraste lo
aplica `src/ui/design/tokens.contrast.test.ts` (S10). Este documento es el complemento
legible para las personas; el contrato de contraste y los nombres de los tokens los aplica
`src/ui/design/tokens.contrast.test.ts` (S10). Las capturas de cada ruta en ambos temas las
genera `npm run capture:media` y se versionan en `docs/media/`.

## Color

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--color-bg` | `#F6F4EE` | `#0E1116` | Fondo de la app |
| `--color-surface` | `#FFFFFF` | `#161A21` | Tarjetas, diálogos, barras |
| `--color-surface-2` | `#EEEBE3` | `#1E232C` | Rellenos sutiles, navegación activa |
| `--color-border` | `#D6D2C6` | `#2B313C` | Solo divisores decorativos |
| `--color-border-strong` | `#7D7A70` | `#6E7788` | Bordes de controles (≥ 3:1) |
| `--color-text` | `#15171C` | `#EDEFF3` | Texto principal |
| `--color-text-muted` | `#555B68` | `#A0A7B5` | Texto secundario |
| `--color-primary` | `#1B47C4` | `#8FAAFF` | Acciones principales, enlaces |
| `--color-primary-hover` | `#13399F` | `#B0C2FF` | Hover |
| `--color-on-primary` | `#FFFFFF` | `#0B1020` | Texto sobre primary |
| `--color-danger` | `#B3261E` | `#FF8A80` | Errores, acciones destructivas |
| `--color-success` | `#17692F` | `#6FD28A` | Éxito |
| `--color-warning` | `#8A5300` | `#F0B04A` | Advertencias |
| `--color-accent` | `#F5C400` | `#FFD23F` | Marca de acento ecuatoriana |
| `--color-on-accent` | `#15171C` | `#15171C` | Texto sobre accent |
| `--focus-ring` | `#1B47C4` | `#8FAAFF` | Contorno de foco |

Las ranuras de series `--series-1..6` son estables por geografía: ECU=1, COL=2, PER=3,
CHL=4, BOL=5, LCN=6 discontinua, WLD=6 punteada. El estilo de línea y los símbolos también
son distintos, así que el color nunca es el único canal.

### Puerta de contraste

El contrato de Vitest recalcula los ratios de luminancia relativa de WCAG 2.x y falla si:
el texto y el texto secundario sobre bg, surface o surface-2 son ≥ 4.5; on-primary sobre
primary es ≥ 4.5; primary, danger, success y warning como texto sobre surface son ≥ 4.5;
border-strong sobre surface y bg es ≥ 3; cada color de serie sobre surface y bg es ≥ 3; y el
texto sobre accent es ≥ 4.5. El `--color-border` decorativo está exento, porque nunca
transmite significado.

Ratios medidos en v0.1.0 (los recalcula la prueba en cada ejecución):

| Par | Claro | Oscuro | Mínimo |
|---|---|---|---|
| texto sobre bg / surface / surface-2 | 16.30 / 17.93 / 15.05 | 16.43 / 15.15 / 13.70 | 4.5 |
| texto secundario sobre bg / surface / surface-2 | 6.19 / 6.81 / 5.72 | 7.83 / 7.22 / 6.52 | 4.5 |
| on-primary sobre primary | 7.65 | 8.44 | 4.5 |
| primary / danger / success / warning sobre surface | 7.65 / 6.54 / 6.78 / 6.33 | 7.78 / 7.64 / 9.35 / 9.15 | 4.5 |
| border-strong sobre surface / bg | 4.29 / 3.90 | 3.87 / 4.19 | 3.0 |
| ranura de serie más débil sobre surface / bg | 5.18 / 4.71 | 6.94 / 7.52 | 3.0 |
| texto sobre accent | 10.91 | 10.91 | 4.5 |

## Tipografía

Raíz de 16 px, base de la UI de 14 px. Caption 12/16, small 13/18, body 14/20, body-lg
16/24, h3 18/26 Inter 600, h2 22/30 Fraunces 600, h1 28/36 Fraunces 600, KPI 32/36 Inter 650
con cifras tabulares. El espaciado entre letras es 0, salvo h1 y h2 con `-0.01em`. Las pilas
de fuentes y los tres subconjuntos OFL incluidos se definen en `fonts.css`.

## Espaciado, radios, elevación, movimiento y capas

- El espaciado es una escala de 4 px desde `--space-0` (0) hasta `--space-11` (64 px); el
  padding del contenido es `--space-7` (24 px).
- Radios: 4 / 8 / 12 px y una píldora de 999 px.
- Elevación: tres sombras; el tema oscuro conserva los desplazamientos y sube la opacidad a
  0.4 / 0.5 / 0.6.
- Movimiento: 120 / 200 / 320 ms con `cubic-bezier(0.2, 0, 0, 1)`; con
  `prefers-reduced-motion: reduce`, toda duración se reduce a 0.01 ms.
- Capas: base 0, sticky 10, popover 30, dialog 40, toast 50, palette 60.
- Layout: barra lateral de 232 px (64 px contraída por debajo de 1100 px o mediante el
  conmutador), barra superior de 56 px, barra de estado de 28 px, área mínima de toque de 32
  px, anillo de foco de 2 px con desplazamiento de 2 px.

## Gráficos

Los gráficos son Apache ECharts 6 con solo los componentes de línea, barra, grid, tooltip,
leyenda, ARIA, título y graphic registrados (ADR 0006). El estilo se lee de los tokens al
renderizar: las líneas de la cuadrícula usan `--color-border`, las etiquetas de los ejes usan
`--color-text-muted` a 12 px en Inter con cifras tabulares, los tooltips se apoyan en
`--color-surface` con `--shadow-2`, las series miden 2.5 px (Ecuador 3 px) y la animación usa
`--dur-base` (0 con movimiento reducido). Las ranuras de series son estables: ECU=1, COL=2,
PER=3, CHL=4, BOL=5, LCN=6 discontinua, WLD=6 punteada, cada una con su propio símbolo
(círculo, cuadrado, triángulo, rombo, pin, rectángulo), y el gráfico en vivo muestra una
leyenda con esa clave de trazo y símbolo para que ninguna línea se identifique solo por color.
Los huecos nunca se conectan. Los valores del eje, del tooltip, de los KPI y de la tabla siguen
la transformación activa: el nivel conserva la unidad propia del indicador, el cambio
interanual es un porcentaje y un índice es un número simple (año base = 100). Las PNG
exportadas agregan un título, una leyenda y la línea de atribución del Banco Mundial.

Cada gráfico es un `role="group"` enfocable con un resumen calculado. Las teclas de flecha se
mueven entre los años que tienen datos en la primera serie, Inicio y Fin saltan al primero y
al último, Escape limpia el tooltip, y cada paso actualiza una región en vivo discreta con
`{geography}, {year}: {value}`. El canvas tiene `aria-hidden`; el conmutador Gráfico / Tabla de
datos siempre ofrece los mismos números en una tabla con leyenda, donde los huecos se muestran
como un guion largo con una etiqueta "No data" oculta visualmente.

## Reglas de accesibilidad

- Cada flujo se puede completar con el teclado. El enlace de salto es el primer elemento
  enfocable y mueve el foco a `main`; el foco siempre es visible (`:focus-visible`).
- Landmarks: `banner` (barra superior), `navigation` (con etiqueta), `main#main`,
  `contentinfo` (barra de estado); la ruta activa lleva `aria-current="page"` más una marca de
  acento que no depende del color.
- Los controles usan la semántica de Radix: Dialog atrapa el foco, se cierra con Escape y
  devuelve el foco a su disparador; Tabs y ToggleGroup admiten las teclas de flecha; Switch
  alterna con Espacio; los pulgares de Slider tienen etiqueta.
- Los controles solo con ícono requieren una prop `label` y renderizan `aria-label`.
- Los toasts viven en una región `role="status"` discreta, se pausan con hover o foco, y pueden
  descartarse con un botón etiquetado.
- Los gráficos son enfocables, se recorren con flechas, Inicio, Fin y Escape, anuncian los
  valores mediante una región discreta y tienen una alternativa en tabla de datos (ADR 0006).
- Axe analiza el shell y la galería de diseño en ambos temas dentro de Vitest, y la suite
  completa de navegador lo repite para cada ruta, tema e idioma.

## Vistas de comparación

Las trayectorias indexan de dos a cuatro indicadores de una geografía a un año base, usando
las ranuras de serie 1 a 4 en el orden de selección, más una línea de referencia discontinua
en 100. El ranking dibuja barras horizontales en orden descendente, colorea Ecuador con
`--series-1` y mantiene todas las demás geografías con `--color-border-strong`, de modo que el
resaltado sobrevive a una impresión en monocromo. Ambas pestañas comparten el conmutador
Gráfico / Tabla de datos y el contrato de teclado del gráfico descrito arriba; la tabla de
ranking coloca al final las geografías sin valor, con la leyenda "No data", y muestra la
diferencia frente a Ecuador con la precisión decimal del propio valor.

## Atajos

`src/app/shortcuts/registry.ts` es el único lugar que define comandos y atajos;
`use-shortcuts.ts` es el único listener global de keydown. `Mod` es Ctrl en Windows y Linux, y
Cmd en macOS. Los acordes con `g` expiran después de un segundo y se ignoran mientras se escribe
en un input, un textarea, un select o un elemento contenteditable, y mientras hay un diálogo
abierto (salvo `Mod+K`).

| Acción | Atajo |
|---|---|
| Abrir la paleta de comandos | `Mod+K` |
| Mostrar la ayuda de atajos | `?` |
| Ir a Explorar | `g` y luego `e` |
| Ir a Comparar: Trayectorias | `g` y luego `c` |
| Ir a Vistas guardadas | `g` y luego `v` |
| Ir a Ajustes | `g` y luego `s` |
| Indicador anterior / siguiente (Explorar) | `[` / `]` |
| Alternar tema claro y oscuro | `Mod+Shift+D` |
| Guardar la vista actual como vista guardada | `Mod+S` |
| Exportar las series visibles como CSV | `Mod+Shift+C` |
| Exportar las series visibles como PNG | `Mod+Shift+P` |

La paleta busca indicadores, geografías, vistas guardadas y comandos con el mismo ranking
determinista e insensible a diacríticos que el panel de catálogo. Los resultados se anuncian
mediante una región discreta, el listbox conserva una única parada de tabulación, y al cerrar la
paleta el foco vuelve al elemento que la abrió.

## Redacción de la UI y estados

El texto es breve, factual y bilingüe; cada cadena vive en `src/ui/i18n/{en,es}.ts`, y la
prueba de paridad falla ante claves faltantes, valores vacíos o `{params}` que no coinciden.
Los números, porcentajes y fechas usan `Intl` con `en-US` o `es-EC`.

| Estado | Contrato |
|---|---|
| Carga | Tarjetas esqueleto y marcadores de gráfico, nunca un destello en blanco; un anuncio discreto de ocupado por región. |
| Vacío | Explica por qué la selección no tiene datos y ofrece una acción de recuperación (por ejemplo, "Ocultar Mundo" o un enlace de vuelta a Explorar). |
| Error | Mensaje en lenguaje claro, una acción de Reintentar cuando la solicitud puede repetirse, y un desplegable de detalles con el mensaje técnico. |
| Problema del conjunto de datos | Pantalla completa de recuperación para una instantánea inválida o ausente, con "Restablecer a la instantánea incluida"; los detalles técnicos quedan en un desplegable. |
| Primer uso | Vistas guardadas explica qué es una vista y enlaza a Explorar en lugar de mostrar una cuadrícula vacía. |
| Éxito | Los toasts anuncian el resultado ("Guardado en …", "Descarga iniciada") en una región discreta y se pausan con hover o foco. |
| Destructivo | Eliminar pide confirmación en un diálogo con foco, nombra la vista y devuelve el foco al cancelar. |

## Desarrollo

- `npm run fonts:sync` regenera `src/ui/design/fonts/`.
- `npx vitest run src/ui/design` ejecuta los contratos de contraste, tema, i18n y primitivas.
- `#/design` muestra la galería en los builds de desarrollo y de E2E, no en el bundle de
  producción.
