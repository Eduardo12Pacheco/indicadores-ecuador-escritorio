# Contribuir

Ecuador Indicators es una aplicación de escritorio local-first con tres runtimes:
TypeScript (UI y dominio), Rust (shell de escritorio y servicios del núcleo) y Python
(pipeline de datos). Las contribuciones son bienvenidas como pull requests enfocados que
mantengan honestas la arquitectura y las pruebas.

## Requisitos previos

| Herramienta | Versión | Notas |
|---|---|---|
| Node.js | 26 recomendado, `>=24` | npm 11 viene con Node; el repositorio no usa pnpm ni corepack. |
| Rust | stable, `>=1.95` | Componentes `rustfmt` y `clippy`. |
| uv | `>=0.11` | Python 3.12 lo resuelve `.python-version`. |
| Paquetes del sistema para Tauri | según el SO | Windows: WebView2 y las herramientas de build de MSVC. macOS: Xcode Command Line Tools. Linux: `libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf`, `xdg-utils`. |

Opcional: `gh` para releases y atestaciones, `cargo-deny` y `cargo-audit` para los jobs de
auditoría, y `WebKitWebDriver` + `tauri-driver` para el E2E nativo en Linux.

## Configuración

```bash
git clone https://github.com/Eduardo12Pacheco/indicadores-ecuador-escritorio.git
cd indicadores-ecuador-escritorio
npm ci
cd pipeline && uv sync --frozen && cd ..
```

En Windows (PowerShell) se usan los mismos comandos; `npm ci` y `uv sync` son
multiplataforma. Los comandos del pipeline asumen que estás dentro de `pipeline/` cuando lo
indican.

## Comandos

| Área | Comando |
|---|---|
| Todas las puertas locales | `npm run verify` |
| Ciclo web rápido | `npm run verify:fast` |
| Lint | `npm run lint` |
| Formato | `npm run format` |
| Tipos | `npm run typecheck` |
| Pruebas unitarias y de componentes | `npm test` |
| Puertas de cobertura | `npm run test:cov` |
| Formato, clippy y pruebas de Rust | `npm run verify:rust` |
| Lint, tipos, pruebas e imports del pipeline | `npm run verify:pipeline` |
| E2E de navegador | `npm run test:e2e` |
| E2E nativo (Linux, requiere prerrequisitos) | `npm run e2e:native` |
| Integridad de datos | `npm run check:data` |
| Drift de bindings | `npm run check:bindings` |
| Presupuesto del bundle | `npm run build && npm run check:bundle` |
| Licencias de producción | `npm run check:licenses` |
| Métricas medidas | `npm run metrics` |
| Regenerar capturas y GIF | `npm run capture:media` |

Usa `npm test -- <patrón>` para una ejecución enfocada de Vitest, `cargo test -p
indicators-core <nombre>` para Rust y `uv run pytest tests/unit/<archivo> -q` dentro de
`pipeline/` para Python. La matriz completa de comandos y el mapeo con CI están en
[docs/TESTING.md](docs/TESTING.md).

## Reglas del repositorio

La dirección de las dependencias es vinculante y está probada:

- `core/domain` de TypeScript no importa nada fuera de sí mismo; `core/application` puede
  importar el dominio y sus propios puertos; los adaptadores pueden importar el núcleo; la UI
  no puede importar adaptadores, la raíz de composición ni `@tauri-apps/*`.
- `domain`, `ports` y `application` de Rust no pueden importar `rusqlite`, `ureq`, `tauri`,
  `std::fs`, `std::net` ni `std::env`; eso pertenece a los adaptadores y al shell.
- `domain` de Python no puede importar `httpx`, `duckdb` ni `sqlite3`; `application` no puede
  importar adaptadores.

Lee [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) antes de agregar una funcionalidad. Una nueva
integración con el sistema operativo va detrás de un puerto. La lógica de producto nueva va en
el núcleo de TypeScript o en un caso de uso, no en un componente de React ni en un comando de
Tauri. Los textos nuevos visibles para el usuario deben ir en `src/ui/i18n/en.ts` y `es.ts` en
el mismo commit. Los cambios de datos pasan por el pipeline de [docs/DATA.md](docs/DATA.md);
nunca edites a mano `data/raw/**` ni la instantánea SQLite.

## Flujo test-first

1. Escribe o actualiza la prueba que falla y describe el comportamiento (RED).
2. Implementa el cambio más pequeño que la haga pasar (GREEN).
3. Refactoriza con la suite en verde. Nunca debilites, omitas ni borres una prueba para
   obtener un build verde; si una verificación requerida no puede ejecutarse en local, registra
   el motivo exacto.
4. Agrega una prueba de propiedades cuando intervenga un invariante de datos (fast-check,
   proptest o Hypothesis) y un escaneo de axe cuando se introduzca una ruta o un diálogo nuevo.

## Convención de commits

Los commits siguen Conventional Commits y se escriben en inglés:

```
feat(explore): add a year-range preset control
fix(export): reject paths without a file name
test(core): cover duplicate years in makeSeries
docs: document the lakehouse manifest
ci: add the native e2e job
chore: bump the playwright lockfile
```

Mantén los commits enfocados y revisables (unas 400 líneas cambiadas o menos). No agregues
trailers `Co-Authored-By` ni de atribución de IA. No reescribas el historial publicado.

## Lista de verificación del pull request

- [ ] El cambio se describe en un párrafo y se vincula a un ADR o a una especificación cuando
      modifica un contrato.
- [ ] Las pruebas se escribieron primero y siguen pasando: `npm run verify` (o los comandos
      enfocados más una nota que explique por qué una puerta exclusiva de CI no puede ejecutarse
      en local).
- [ ] `npm run lint`, `npm run typecheck` y los umbrales de cobertura están en verde.
- [ ] Los textos nuevos de la UI existen en inglés y en español; los escaneos de axe cubren las
      rutas y los diálogos nuevos en ambos temas.
- [ ] No se agregan a git secretos, datos personales, rutas absolutas del home ni archivos
      generados de gran tamaño.
- [ ] `data/MANIFEST.json`, la instantánea y los fixtures coinciden con la salida del pipeline
      cuando cambian los datos.
- [ ] `CHANGELOG.md` no necesita edición manual: se genera a partir de los commits al momento de
      la release.

## Reportar errores y problemas de seguridad

Usa las plantillas de incidencias de GitHub para los errores funcionales y las solicitudes de
funcionalidades. Reporta los problemas de seguridad de forma privada mediante GitHub Security
Advisories, tal como se describe en [SECURITY.md](SECURITY.md); no abras una incidencia pública
por una vulnerabilidad sin corregir.
