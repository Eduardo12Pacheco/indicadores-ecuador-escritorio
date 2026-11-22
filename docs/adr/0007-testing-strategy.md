# ADR 0007 — Estrategia de pruebas end-to-end en navegador y de accesibilidad

## Estado

Aceptada (T11, 2026-11-20)

## Contexto

La aplicación de escritorio es una UI en React sobre un núcleo delgado en Rust. La
mayor parte de la lógica del producto ya está cubierta por pruebas de Vitest y de
Rust, pero tres clases de defectos solo pueden detectarse en un navegador real:
flujos del router por hash, persistencia a través del adaptador real de
`localStorage` y comportamiento de accesibilidad y de layout en el navegador. El plan
exige que `offline.spec.ts` demuestre S1 con un guardia de red, que `a11y.spec.ts`
ejecute axe sobre cada ruta, tema e idioma (S11), y que `states.spec.ts` ejercite las
rutas de recuperación de S12. El E2E nativo es una capa separada (T12).

## Decisión

- **Playwright 1.65, con dos proyectos de navegador.** Chromium y WebKit ejecutan las
  mismas especificaciones a 1280×800. WebKit aproxima WKWebView y WebKitGTK; Chromium
  se parece a WebView2. Las trazas se conservan ante fallos y las capturas solo se
  guardan cuando falla una prueba; no hay una suite de regresión visual porque la
  rasterización de fuentes entre sistemas operativos la vuelve frágil.
- **Probar el frontend de producción.** La configuración ejecuta `npm run build:e2e` y
  el preview de Vite en el puerto 18173. Ese build carga la instantánea JSON mínima a
  través del adaptador en memoria, así que las pruebas ejercitan las mismas rutas de
  código que el build del navegador, manteniéndose deterministas y sin conexión. El
  adaptador IPC nativo está cubierto por las pruebas de comandos de Rust y por T12.
- **Sembrar el estado antes del primer render.** `e2e/support/fixtures.ts` siembra las
  claves espejo de tema e idioma y el documento de configuración autoritativo una sola
  vez por contexto (protegido por `sessionStorage`), de modo que una recarga conserve lo
  que la propia aplicación persistió. Las pruebas pueden inyectar las mismas claves
  `e2e:fault` que entiende el adaptador.
- **Sin esperas fijas.** La suite usa solo aserciones web-first. `waitForTimeout` está
  prohibido por revisión y lo verifica el comando de aceptación.
- **Escaneos completos de axe, sin exclusiones.** `e2e/support/a11y.ts` ejecuta las
  etiquetas de axe `wcag2a`, `wcag2aa`, `wcag21a` y `wcag21aa` sobre siete rutas, dos
  temas y dos idiomas, más cuatro diálogos abiertos. Cualquier exclusión requeriría una
  justificación escrita; la suite actual no tiene ninguna.
- **El guardia de red es la evidencia de S1.** `offline.spec.ts` aborta toda solicitud
  que no sea a localhost y afirma `blockedRequests.length === 0` después de un flujo
  completo Explore → Compare → Save → Export.
- **Los modificadores de plataforma provienen del user agent, no del sistema operativo
  anfitrión.** WebKit de Playwright informa un UA de macOS incluso en Linux, así que los
  helpers derivan `Meta` o `Control` de `navigator.userAgent`, en espejo de
  `detectPlatform` en la aplicación.

## Consecuencias

- La CI necesita `npx playwright install --with-deps chromium webkit` y los
  prerrequisitos de Tauri en Linux para el build. La suite de navegador no forma parte
  del ciclo rápido `verify:fast`; se ejecuta en el job dedicado de CI.
- Las fallas de prueba producen una traza y una captura en `test-results/`, que el job
  de CI sube. Las ejecuciones exitosas quedan limpias.
- El comportamiento exclusivo de la app nativa (instancia única, estado de la ventana,
  diálogos de archivos) sigue sin probarse en esta capa y lo gestiona T12. El E2E
  nativo en macOS queda fuera de alcance porque `tauri-driver` no tiene driver para
  WKWebView, según se documenta en <https://v2.tauri.app/develop/tests/webdriver/> y
  se verificó el 2026-11-19.
- El adaptador en memoria necesita las claves `e2e:fault` documentadas para simular
  fallas del conjunto de datos, catálogo, observación e instantánea. Esas claves son ganchos de
  prueba, no configuración visible para el usuario.

## Alternativas

- **Cypress en lugar de Playwright.** Cypress tiene un runner maduro y depuración con
  viaje en el tiempo, pero su soporte para WebKit es experimental y no coincide tan de
  cerca con la historia de WebView de Tauri como el Chromium y el WebKit incluidos en
  Playwright.
- **Probar solo contra un servidor de desarrollo.** Arranca más rápido, pero no
  ejercitaría el build de producción, las rutas de assets con hash ni la carga de
  fixtures en memoria que usa la release.
- **E2E nativo en cada plataforma.** Descartado porque `tauri-driver` soporta solo
  Windows y Linux; un plugin de proveedor embebido para macOS cambiaría el binario de
  release, contradiciendo la regla de que los binarios probados son los que se
  distribuyen (ADR 0007 / D18).
- **Pruebas de regresión visual con capturas de referencia.** Descartadas: la
  rasterización de fuentes entre sistemas operativos vuelve frágiles las capturas, así
  que siguen siendo documentación generada por el proyecto de medios, no aserciones de
  aprobado o fallido.
- **Pruebas unitarias con una implementación real de canvas.** Descartadas: jsdom no
  tiene canvas, y afirmar internos de ECharts duplicaría las pruebas del proveedor. Un
  fake de `ChartRenderer` cubre el contrato de interacción; las suites de navegador y
  nativa cubren el renderizado real.
