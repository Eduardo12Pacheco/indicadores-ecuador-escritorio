# Ecuador Indicators
**Español** · [English](README.en.md)

[![CI](https://github.com/Eduardo12Pacheco/indicadores-ecuador-escritorio/actions/workflows/ci.yml/badge.svg)](https://github.com/Eduardo12Pacheco/indicadores-ecuador-escritorio/actions/workflows/ci.yml)
[![Último release](https://img.shields.io/github/v/release/Eduardo12Pacheco/indicadores-ecuador-escritorio)](https://github.com/Eduardo12Pacheco/indicadores-ecuador-escritorio/releases/latest)
[![Licencia: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Plataformas](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-1B47C4)](docs/INSTALL.md)

Una aplicación de escritorio pulida y offline-first para explorar, comparar y exportar indicadores ecuatorianos desde una instantánea del Banco Mundial incluida en la aplicación.

**Instalación:** lee primero la [guía de instalación](docs/INSTALL.md); las compilaciones no están firmadas, así que Windows SmartScreen y macOS Gatekeeper piden confirmación. El primer release etiquetado está pendiente; mientras tanto, [ejecútalo desde el código fuente](#desarrollo).

![Recorrido animado por Ecuador Indicators](docs/media/hero.gif)

## Por qué

Las estadísticas ecuatorianas están repartidas en portales con formatos y licencias distintas. Esta aplicación incluye una instantánea reproducible del Banco Mundial que funciona sin navegador, sin API key y sin conexión a internet, y trata los datos como un artefacto editorial: con fuente, atribución, verificación y honestidad sobre los vacíos.

## Funcionalidades

- **Explorar** 38 indicadores WDI en 8 temas, con pares, rangos de años, transformaciones Level/YoY/Index, tres tipos de gráfico y una tabla de datos alternativa.
- **Comparar** trayectorias indexadas a un año base, o un ranking entre países con Ecuador resaltado y los valores faltantes al final.
- **Buscar** con `Mod+K` (sin distinguir diacríticos en inglés ni en español) y con atajos de teclado; las vistas guardadas restauran el estado exacto de la página.
- **Exportar** CSV (RFC 4180) y PNG a 2× con título, leyenda y atribución; **Ajustes** cubre tema, idioma, actualizaciones opcionales e instantáneas personalizadas.
- **Accesible**: flujos pensados primero para teclado, escaneos axe WCAG 2.0/2.1 AA, temas claro y oscuro, e interfaz completa en inglés y español.

## Capturas

| Explorar | Comparar | Datos y Acerca de |
|---|---|---|
| ![Explorar en tema claro](docs/media/screenshots/explore-light.png) | ![Trayectorias indexadas](docs/media/screenshots/compare-trajectories.png) | ![Procedencia y fuentes de los indicadores](docs/media/screenshots/data-about.png) |

Las demás capturas (modo oscuro, español, paleta de comandos) están en `docs/media/screenshots/`; todas se generan con `npm run capture:media`.

## Instalación

```bash
sudo apt install ./ecuador-indicators_0.1.0_linux_x64.deb  # Linux
open ecuador-indicators_0.1.0_macos_arm64.dmg               # macOS
# Windows: ejecuta ecuador-indicators_0.1.0_windows_x64.exe
```

Las alternativas AppImage, RPM, DMG para Intel y MSI, los checksums y `gh attestation verify` están en [docs/INSTALL.md](docs/INSTALL.md).

## Datos

La instantánea incluida republica 38 indicadores del World Development Indicators (WDI, source id 2) del Banco Mundial para Ecuador, Colombia, Perú, Chile, Bolivia, América Latina y el Caribe y el Mundo. WDI tiene licencia CC BY 4.0; cada indicador acredita a su proveedor. Consulta [docs/DATA.md](docs/DATA.md) para el esquema, el linaje y las limitaciones.

```bash
cd pipeline && uv sync --frozen
uv run ecuador-data refresh   # red: API del Banco Mundial -> data/raw + MANIFEST.json
uv run ecuador-data build     # sin conexión: caché raw -> snapshot schema v1
uv run ecuador-data verify    # checksums, conteos, hashes lógico y de archivo
```

Dos builds de la misma caché raw producen el mismo `logical_sha256`.

## Arquitectura

```mermaid
flowchart LR
  UI["React UI<br/>src/ui + src/app"] --> Core["Núcleo TypeScript<br/>dominio + casos de uso"]
  Core --> Ports["Puertos"]
  Ports -.->|Tauri IPC| Shell["Shell Rust<br/>src-tauri"]
  Shell --> Services["Servicios Rust<br/>crates/indicators-core"]
  Services --> Snapshot[("snapshot SQLite de solo lectura")]
  Pipeline["Pipeline Python<br/>ecuador-data"] -->|"refresh + build"| Snapshot
```

Tres runtimes y un solo contrato: un dominio TypeScript puro, un núcleo Rust deliberadamente delgado y un pipeline Python que nunca entra en el runtime de escritorio. Las reglas hexagonales se prueban en los tres lenguajes; consulta [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Stack técnico

| Área | Elección |
|---|---|
| Shell de escritorio | Tauri 2 (Rust), NSIS/MSI, DMG, DEB/RPM/AppImage |
| UI | React 19, TypeScript 7, Vite 8, react-router 7, TanStack Query 5 |
| Gráficos | Apache ECharts 6, tree-shaken, tabla alternativa accesible |
| Estilos | CSS Modules + tokens en custom properties, primitivas Radix, cmdk |
| Pipeline de datos | Python 3.12, uv, pydantic, httpx, Typer, SQLite, DuckDB (opcional) |
| Pruebas | Vitest + Testing Library + fast-check, Playwright + axe, cargo test + proptest, pytest + Hypothesis |
| CI/CD | GitHub Actions en Linux, Windows y macOS; releases disparados por tag |

## Calidad

| Puerta | Valor medido |
|---|---|
| Cobertura TypeScript | 91.7% líneas · 83.87% ramas · 91.67% sentencias · 91.56% funciones |
| Cobertura del pipeline Python | 96.1% |
| E2E de navegador | 68 escenarios (proyectos Chromium + WebKit) |
| Cobertura de líneas del núcleo Rust | 88.9% medido en la ejecución de CI 44749667530 (puerta: 85%, `cargo llvm-cov`) |
| Total gzip de JavaScript | 392,397 B |
| Instantánea incluida | 38 indicadores · 8 temas · 7 geografías · 11,780 observaciones |

`npm run metrics` imprime cada valor anterior salvo el de Rust, que sale de `cargo llvm-cov -p indicators-core`. El presupuesto gzip es 716,800 B y la suite E2E nativa corre en Linux dentro de CI.

## Desarrollo

```bash
npm ci
npm run tauri dev
npm run verify
```

`npm run verify` ejecuta Biome, `tsc`, cobertura de Vitest, las verificaciones de Rust y Python, drift de bindings, verificación de datos, sincronización de versiones, el build, el presupuesto del bundle, las revisiones de licencias y los dos proyectos de Playwright. Consulta [docs/TESTING.md](docs/TESTING.md).

## Limitaciones

- Solo datos anuales del Banco Mundial; muchas series tienen rezagos de años y algunas son estimaciones modeladas, así que el último año disponible puede variar según el indicador.
- No es un producto oficial del BCE ni del INEC; esas fuentes están documentadas como adaptadores futuros, no incluidos.
- Los instaladores no están firmados: SmartScreen y Gatekeeper requieren aprobación. Cada release publica checksums y atestaciones de procedencia.
- El E2E nativo cubre solo Linux porque `tauri-driver` no tiene driver para WKWebView; los mismos flujos corren en WebKit y Chromium en la suite de navegador.
- Las capturas usan la instantánea completa a través del adaptador en memoria.

## Documentación

[Arquitectura](docs/ARCHITECTURE.md) · [Configuración](docs/ARCHITECTURE.md#configuración) · [Datos](docs/DATA.md) · [Diseño](docs/DESIGN.md) · [Pruebas](docs/TESTING.md) ·
[Instalación](docs/INSTALL.md) · [Publicación](docs/RELEASING.md) · [Manifiesto lakehouse](docs/LAKEHOUSE-MANIFEST.md) ·
[Contribuir](CONTRIBUTING.md) · [Seguridad](SECURITY.md) · [Avisos de terceros](THIRD_PARTY_NOTICES.md)

## Licencia

MIT © 2026 Eduardo Pacheco. Los datos del Banco Mundial incluidos son CC BY 4.0; consulta [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
