# ADR 0006 — Gráficos y accesibilidad de los gráficos

## Estado

Aceptada (T8, 2026-11-20)

## Contexto

Explore necesita un indicador para hasta cinco geografías, tres tipos de gráfico
(línea, área, barra), transformaciones Level/YoY/índice, series sensibles a los
huecos y una exportación PNG que incluya título, leyenda y atribución del Banco
Mundial (S3, S7, S11). Los gráficos se renderizan en canvas, así que son invisibles
para los lectores de pantalla salvo que la aplicación ofrezca una alternativa
accesible y una interacción por teclado. El plan descarta una suite de regresión
visual (por la rasterización de fuentes entre sistemas operativos) y pide pruebas de
componentes contra un renderizador falso.

## Decisión

- **ECharts 6, con tree-shaking.** Solo se registran `LineChart`, `BarChart`, `Grid`,
  `Tooltip`, `Legend`, `Aria`, `Title`, `Graphic` y `CanvasRenderer`, y las
  importaciones usan subrutas `echarts/core` (nunca la raíz `echarts`). La prueba de
  arquitectura permite `echarts` solo en `src/ui`; el núcleo nunca lo ve.
- **Un puerto `ChartRenderer`.** `renderer.ts` define
  `setOption/showTip/hideTip/toDataURL/resize/dispose`; `echarts-renderer.ts` lo
  implementa con un `ResizeObserver` y un canvas sensible al DPR. Los componentes
  reciben una fábrica inyectada, así que las pruebas usan `FakeChartRenderer` y nunca
  necesitan una implementación de canvas.
- **Constructores de opciones puros.** `build-chart-option.ts` recibe el modelo de
  Explore, un `ChartTheme` resuelto y una configuración regional, y devuelve el objeto
  de opciones. El modo exportación agrega el título, la leyenda y el pie de
  atribución. `chart-theme.ts` lee los tokens de diseño del documento y recurre a las
  paletas de D9 cuando las propiedades personalizadas no están disponibles (pruebas,
  captura sin interfaz).
- **Estilo estable de las series.** `series-style.ts` fija el mapa geografía-ranura
  (ECU=1 … BOL=5; LCN y WLD comparten la ranura 6 con líneas discontinuas y punteadas),
  además de un símbolo por ranura. Las series nunca dependen solo del color.
- **Recorrido por teclado del gráfico.** `use-chart-keyboard.ts` mueve un cursor por
  los años con datos de la primera serie: Izquierda y Derecha avanzan, Inicio y Fin
  saltan, y Escape lo limpia. Dispara `showTip` y devuelve el anuncio discreto
  `{geography}, {year}: {value}`. `ChartCanvas` renderiza esa región, convierte el
  gráfico en un `role="group"` enfocable con un resumen calculado y mantiene el canvas
  con `aria-hidden`.
- **Una alternativa de tabla en la misma página.** `DataTable` alinea todas las series
  sobre la unión de años, pone Ecuador primero, usa atributos `scope` y muestra un
  "No data" oculto visualmente para los huecos.
- **Exportación PNG con el mismo constructor.** `export-png.ts` reconstruye la opción en
  modo exportación, pide al renderizador una data URL a 2x y la convierte en bytes; T10
  conecta el diálogo nativo de guardado. El contrato de título y atribución lo controla
  el constructor, no el renderizador.

## Consecuencias

- La lógica de los gráficos (orden de series, colores, huecos, transformaciones,
  metadatos de exportación) queda cubierta por pruebas unitarias rápidas; solo el
  adaptador delgado de ECharts necesita un DOM.
- El bundle crece unos 200 KB sin comprimir (~95 KB con gzip para el chunk diferido
  del dashboard), todavía dentro del presupuesto de 700 KiB con gzip. El chunk de
  producción tiene tree-shaking por construcción; importar la raíz de ECharts sería un
  defecto de revisión.
- La información está duplicada por diseño: canvas, región en vivo y tabla. La tabla
  siempre está disponible mediante el selector de vista.
- La exportación PNG es una captura del gráfico a 2x con etiquetas de datos y
  atribución; no es un documento tipográfico de calidad de impresión.

## Alternativas

- **uPlot:** más pequeño, pero sin una historia de tooltip accesible ni de ARIA, y sin
  un auxiliar de exportación.
- **Observable Plot:** interacción débil y sin control de leyenda ni de tooltip a este
  nivel de detalle.
- **Recharts:** un árbol React de SVG es más pesado para gráficos de varias series y
  ofrece menos control sobre la exportación desde canvas y el recorrido por teclado.
- **Renderizado del lado del servidor a PNG:** agregaría una dependencia nativa pesada
  a una aplicación de escritorio que debe compilar en tres sistemas operativos.
