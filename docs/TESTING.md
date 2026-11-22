# Guía de pruebas

Esta guía describe las capas de prueba, los comandos exactos y las reglas de determinismo
que usa el repositorio. Es el complemento legible para personas del workflow de CI.

## Pirámide de pruebas

| Capa | Runner | Ubicación | Qué demuestra |
|---|---|---|---|
| Pruebas unitarias y de propiedades de TypeScript puro | Vitest 5 + fast-check | `src/core/**/*.test.ts` | transformaciones, estadísticas, CSV, búsqueda, estado de vista, casos de uso |
| Pruebas de componentes y de proveedores | Vitest + Testing Library | `src/ui/**/*.test.tsx` | comportamiento con teclado, validación, estados vacío, error y carga, axe (jsdom) |
| Pruebas de scripts | Vitest | `scripts/__tests__` | sincronización de versiones, presupuesto del bundle, recolección de artefactos |
| Pruebas unitarias, de integración y de propiedades de Rust | `cargo test` + proptest | `crates/indicators-core`, `src-tauri` | contratos de la instantánea, tienda de usuario, feed de actualizaciones, comandos IPC |
| Pruebas unitarias y de integración de Python | pytest + Hypothesis | `pipeline/tests` | catálogo, adaptador del Banco Mundial, build y verify de la instantánea, importación lakehouse |
| End-to-end en navegador y accesibilidad | Playwright 1.65 (Chromium + WebKit) | `e2e/` | enrutamiento real, persistencia, descargas, flujos con teclado y escaneos WCAG de axe |
| End-to-end nativo | WebdriverIO + tauri-driver | `e2e-native/` | la ventana de escritorio real en Linux |
| Reproducibilidad de datos | `ecuador-data verify` | `data/` | checksums raw, conteos del esquema y el hash lógico |

## Comandos

```bash
# Ciclo rápido de TypeScript
npm run test
npm run test:cov          # aplica los umbrales de cobertura
npm run typecheck
npm run lint

# Todo lo que ejecuta la puerta de CI en local
npm run verify

# Valores medidos usados por la tabla de Calidad del README
npm run metrics

# End-to-end en navegador (construye el bundle e2e e inicia el preview de Vite)
npx playwright install chromium webkit
npm run test:e2e
npx playwright test --project=chromium
npx playwright test --project=webkit
npx playwright test e2e/offline.spec.ts --project=chromium

# Rust
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
cargo fmt --all --check

# Python
cd pipeline
uv sync --frozen
uv run pytest -q
uv run ruff check . && uv run ruff format --check .
uv run mypy --strict src
```

`npm run test:e2e` usa `playwright.config.ts`: ejecuta `npm run build:e2e` (la instantánea
JSON mini a través del adaptador en memoria) y luego sirve `dist/` en el puerto 18173.
`e2e/media/**` pertenece al proyecto de captura y se ignora en la ejecución por defecto.

## Qué cubre la suite E2E

- `explore.spec.ts`: PIB por defecto, tarjetas de KPI, transformación interanual y estado de
  la URL, pares, preajustes de rango y la alternativa de tabla de datos.
- `compare.spec.ts`: año base de las trayectorias, el límite de cuatro indicadores, orden del
  ranking, resaltado de Ecuador, geografías faltantes al final y enrutamiento de pestañas.
- `palette.spec.ts`: `Mod+K`, búsqueda en español insensible a diacríticos, Enter, restauración
  del foco con Escape, resultados vacíos y acciones de geografía.
- `views.spec.ts`: guardar con `Mod+S`, persistencia tras recargar, reabrir restaurando el
  estado exacto de la URL, renombrar y confirmación de eliminación.
- `export.spec.ts`: encabezado CSV exacto, número de filas y valores; firma PNG.
- `settings.spec.ts`: aplicación inmediata y persistencia de tema e idioma, comprobación de
  actualizaciones desactivada por defecto, sin solicitud de actualización al iniciar, conteos
  del conjunto de datos.
- `states.spec.ts`: estado vacío, reintento tras una falla inyectada y la pantalla de problema
  del conjunto de datos con recuperación.
- `keyboard.spec.ts`: enlace de salto, paleta, flechas del catálogo, recorrido del gráfico,
  diálogo de guardado y diálogo de atajos, sin ratón.
- `offline.spec.ts`: Explorar → Comparar → Guardar → Exportar con un guardia de red que aborta
  las solicitudes fuera de localhost y afirma cero intentos (S1).
- `layout.spec.ts`: ventana mínima de 960×640, barra lateral contraída, sin desplazamiento
  horizontal y sin acciones principales recortadas.
- `a11y.spec.ts`: axe con `wcag2a`, `wcag2aa`, `wcag21a` y `wcag21aa` sobre cada ruta, tema e
  idioma (28 escaneos), más los diálogos de paleta, guardado, atajos y eliminación (32 pruebas
  en total).

La suite nunca usa esperas fijas (`waitForTimeout` está prohibido); se apoya en aserciones
web-first y en el estado visible para la persona usuaria.

## Reglas de determinismo

- Ninguna prueba realiza una solicitud de red real. El adaptador del Banco Mundial usa
  fixtures de `respx`; el feed de releases de GitHub usa `httpmock` y un fixture JSON grabado;
  las pruebas de navegador usan la instantánea mini incluida.
- El adaptador en memoria lee un archivo JSON por contexto de navegador. Las pruebas siembran
  `localStorage` antes del primer render y nunca comparten estado entre pruebas.
- Las pruebas de propiedades usan semillas fijas: la semilla de fast-check está en
  `vitest.config.ts`, `derandomize` de Hypothesis en CI y `PROPTEST_RNG_SEED` para Rust.
- Las pruebas de integración de Rust, de Python y de la tienda de usuario usan archivos SQLite
  reales en directorios temporales.
- Las capturas y las trazas solo se escriben ante fallos (`test-results/`), y el proyecto de
  captura en `e2e/media/` es documentación, no aserciones.

## Notas del entorno local

La descarga de WebKit de Playwright necesita los paquetes de Ubuntu `libicu74` y `libxml2`;
CI los instala con `npx playwright install --with-deps`. En una estación de trabajo sin sudo,
extrae esos dos paquetes de runtime en el caché del navegador de Playwright y ejecuta con
`PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`; esto es una solución solo local, no un requisito
del repositorio. El E2E nativo solo se ejecuta en Linux por diseño (ADR 0007).

## Cobertura y puertas

| Puerta | Umbral | Dónde |
|---|---|---|
| Vitest líneas / sentencias / funciones | 85 % | `vitest.config.ts`, `npm run test:cov` |
| Vitest ramas | 80 % | `vitest.config.ts` |
| `src/core/**` | 95 % en líneas / sentencias / funciones, 90 % en ramas | `vitest.config.ts` |
| Líneas de Rust en `indicators-core` | 85 % | CI mediante `cargo llvm-cov` |
| `pipeline/src` en Python | 85 % | addopts de pytest |

Números medidos en v0.1.0 (2026-11-20):

| Artefacto | Valor | Producido por |
|---|---|---|
| TypeScript líneas / ramas / sentencias / funciones | 91.7% / 83.87% / 91.67% / 91.56% | `npm run test:cov` → `coverage/coverage-summary.json` |
| Cobertura del pipeline de Python | 96.1% | `uv run pytest` → `pipeline/coverage.json` |
| Escenarios E2E de navegador | 68 por proyecto de navegador; 68 aprobaron en Chromium en local, el proyecto WebKit corre en CI | `npm run test:e2e` → `.generated/playwright.json` (`npm run metrics` → `playwright.scenarios`) |
| Líneas de Rust en `indicators-core` | 88.9% medido en la ejecución de CI 44749667530 (puerta 85%) | `cargo llvm-cov -p indicators-core --fail-under-lines 85` |
| Total gzip de JavaScript | 392,397 B (presupuesto 716,800 B) | `npm run build` + `node scripts/check-bundle-size.mjs` |
| Instantánea | 38 indicadores, 8 temas, 7 geografías, 11,780 observaciones | `data/MANIFEST.json` |

`npm run metrics` imprime los mismos valores en JSON, salvo el número de Rust. Ese número no
se mide en local: el job `rust-coverage` de CI ejecuta `cargo llvm-cov`, aplica la puerta del
85 % e imprime el porcentaje de líneas (88.91% en la ejecución 44749667530, el valor mostrado
arriba).

## Mapa de jobs de CI

| Job de CI | Equivalente local |
|---|---|
| `lint` | `npm run lint`, `npm run typecheck`, `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `uv run ruff check`, `uv run ruff format --check`, `uv run mypy --strict src`, `uv run lint-imports`, `uv lock --check` |
| `ts` (3 SO) | `npm run test:cov` |
| `rust` (3 SO) | `cargo test --workspace` |
| `rust-coverage` | `cargo llvm-cov -p indicators-core --fail-under-lines 85` (solo en CI) |
| `pipeline` (3 SO) | `cd pipeline && uv run pytest` |
| `data` | `uv run ecuador-data verify` más las comparaciones de reconstrucción determinista y de fixtures |
| `bindings` | `npm run check:bindings` |
| `e2e-web` | `npx playwright install --with-deps chromium webkit && npm run test:e2e` |
| `e2e-native` | `xvfb-run -a npm --prefix e2e-native test` después de `npx tauri build --no-bundle` |
| `audit`, `secrets`, `licenses` | `npm audit --omit=dev --audit-level=high`, `cargo audit`, `cargo deny check`, `uv run pip-audit`, `gitleaks git`, `npm run check:licenses` |
| `build-smoke`, `version` | `npm run build`, `npx tauri build --no-bundle`, `--self-check`, `npm run check:version` |

## E2E nativo

La suite de WebdriverIO en `e2e-native/` controla la ventana real a través de `tauri-driver` +
WebKitWebDriver en Linux. Necesita `tauri-driver`, `WebKitWebDriver` y una pantalla:
`node scripts/native-e2e-prereqs.mjs` informa cada elemento faltante y termina con código 3.
CI instala los paquetes y ejecuta la suite bajo `xvfb-run`; el mismo comando es
`npm run e2e:native`. macOS queda excluido porque `tauri-driver` no tiene driver para WKWebView
(ADR 0007).

## Limitaciones conocidas

- La cobertura de líneas de Rust, `cargo deny` y `cargo audit` en los runners, las matrices de
  tres sistemas operativos y el E2E nativo solo se ejecutan en GitHub Actions; el host local no
  puede ejecutarlos (no tiene rustup, llvm-tools ni WebKitWebDriver) y en su lugar informa el
  motivo, sin inventar un resultado.
- WebKit de Playwright en una estación de trabajo sin `libicu74` ni `libxml2` necesita
  `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` después de extraer esos paquetes en el caché
  del navegador. CI los instala con `--with-deps`.
- Los tamaños de los instaladores solo se informan a partir de artefactos de release reales; no
  se ha publicado ninguna release en v0.1.0.
- La regresión visual queda fuera de alcance de forma intencional; las capturas son
  documentación generada por `npm run capture:media`, no aserciones.
