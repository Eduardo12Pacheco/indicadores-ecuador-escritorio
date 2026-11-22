# ADR 0004: Contrato IPC y bindings tipados

## Estado

Aceptada

## Contexto

La UI en React debe llamar al shell de Rust sin manejar JSON de forma ad hoc en
cada componente. Además, cada comando necesita una forma de error estable para que
la UI muestre un estado significativo en lugar de interpretar texto. El contrato
debe poder verificarse en CI: un DTO de Rust que cambie debe hacer fallar el build
si los bindings de TypeScript versionados no se regeneraron.

## Decisión

Exponer exactamente catorce comandos de Tauri `async` (D24). Cada comando:

- se registra en `src-tauri/src/lib.rs::configure_builder`, que es genérico sobre
  `tauri::Runtime` para que `tauri::test::mock_builder` ejercite exactamente el
  mismo manejador;
- ejecuta el trabajo bloqueante de SQLite o del sistema de archivos dentro de
  `tauri::async_runtime::spawn_blocking` y devuelve `Result<T, ErrorDto>`;
- asigna cada `CoreError` a su código estable (`SNAPSHOT_INVALID`,
  `SNAPSHOT_NOT_FOUND`, `VIEW_NOT_FOUND`, `VIEW_INVALID`, `LIMIT_EXCEEDED`,
  `STORAGE`, `EXPORT_REJECTED`, `UPDATE_FEED`, `NETWORK`, `INTERNAL`).

| Comando | Argumentos | Devuelve |
|---|---|---|
| `app_info` | ninguno | `AppInfo {version, platform, data_dir, log_dir}` |
| `dataset_info` | ninguno | `DatasetInfo` |
| `dataset_catalog` | ninguno | `Catalog` |
| `dataset_observations` | `codes: string[]`, `iso3s: string[]` | `Observation[]` |
| `dataset_open_snapshot` | `path: string` | `DatasetInfo` |
| `dataset_reset_snapshot` | ninguno | `DatasetInfo` |
| `views_list` | ninguno | `SavedView[]` |
| `views_create` | `view: NewView` | `SavedView` |
| `views_update` | `id: string`, `view: NewView` | `SavedView` |
| `views_delete` | `id: string` | `void` |
| `settings_get` | ninguno | `Settings` |
| `settings_set` | `settings: Settings` | `void` |
| `export_save` | `path: string`, `content: number[]` | cadena con la ruta guardada |
| `updates_check` | `force: boolean` | `UpdateStatus` |

Los DTO del núcleo derivan `serde` y `ts_rs::TS`; `AppInfo` vive en el shell y
también deriva ambos. `cargo test` escribe los bindings versionados en
`src/adapters/tauri/generated/` (19 archivos del núcleo más `AppInfo.ts`). T6
agrega esquemas zod que se verifican estáticamente contra esos tipos generados y
una puerta de control de desviación `check:bindings` (T13 la envuelve en
`scripts/check-bindings-drift.mjs`).

Los argumentos siguen la conversión por defecto de Tauri de camelCase a
snake_case, así que la UI llama a `dataset_open_snapshot` con `{ path }`, a
`views_create` con `{ view }`, a `dataset_observations` con `{ codes, iso3s }` y a
`updates_check` con `{ force }`. `export_save` devuelve la ruta de destino para que
el toast de éxito pueda nombrarla; la UI ya conoce esa ruta, pero devolverla
mantiene el comando autoconsistente.

`--self-check` no usa intencionalmente la capa IPC: se ejecuta antes de que arranque
Tauri, resuelve los mismos directorios tipados desde `AppConfig`, abre el mismo
lector de instantánea de solo lectura y la misma tienda de usuario migrada.

## Consecuencias

- La UI no puede inventar un comando ni un código de error; un manejador faltante es
  un fallo de compilación en las pruebas del shell.
- Un cambio de DTO sin regenerar los bindings deja el árbol de trabajo sucio y hace
  fallar el CI.
- El shell debe mantener su propia resolución de directorios (`config.rs`)
  sincronizada con la semántica de `app_data_dir` y `app_log_dir` de Tauri, porque
  self-check no tiene un `AppHandle`. El resolvedor replica las rutas de plataforma
  documentadas por Tauri y está cubierto por pruebas unitarias; si Tauri cambia esas
  rutas, se actualiza un solo módulo.
- `AppInfo` es el único tipo IPC definido fuera del crate del núcleo. Existe para
  datos del sistema operativo, no para conceptos de dominio; mantenerlo en el shell
  evita filtrar rutas del sistema de archivos hacia el núcleo puro.

## Alternativas

- **Devolver `serde_json::Value` desde los comandos**: sin bindings, sin control de
  desviación, y cada componente tendría que volver a validar los payloads.
- **Un crate separado `ipc-contract`**: una unidad de compilación más para un solo
  DTO; el núcleo ya posee todos los tipos del wire excepto `AppInfo`.
- **Generación con OpenAPI o JSON-RPC**: agrega un toolchain pensado para servidores
  a una frontera IPC de escritorio que Tauri ya modela de forma nativa.
