# ADR 0003: Arquitectura hexagonal en Rust, TypeScript y Python

## Estado

Aceptada

## Contexto

La aplicación incluye tres runtimes: un shell de escritorio delgado en Rust, una
UI en TypeScript y un pipeline de datos en Python. Sin un límite explícito, la
lógica del producto se filtra hacia los comandos de Tauri o los componentes de
React, y el "núcleo tipado" queda en un eslogan. El shell de escritorio también
debe seguir siendo reemplazable: los mismos servicios deben poder probarse sin una
ventana, y el runtime de escritorio nunca debe importar el pipeline de datos.

## Decisión

Aplicar un único modelo hexagonal a cada runtime:

| Runtime | Dominio / aplicación | Puertos | Adaptadores | Raíz de composición |
|---|---|---|---|---|
| TypeScript | `src/core/domain`, `src/core/application` | `src/core/application/ports.ts` | `src/adapters/{tauri,memory}` | `src/app/bootstrap.ts` |
| Núcleo Rust | `crates/indicators-core/src/{domain,application}` | `ports.rs` | `crates/indicators-core/src/adapters` | `src-tauri/src/lib.rs` |
| Python | `pipeline/src/ecuador_data/{domain,application}` | `ports.py` | `pipeline/src/ecuador_data/adapters` | `pipeline/src/ecuador_data/cli.py` |

La dirección de las dependencias apunta solo hacia adentro. `src-tauri` es una
raíz de composición: analiza los argumentos de la CLI, resuelve la configuración
tipada, abre la instantánea incluida, conecta los adaptadores del núcleo, crea la
ventana y expone los comandos IPC. No contiene lógica analítica ni de persistencia
propia. El núcleo de Rust nunca depende de Tauri; el dominio de Python nunca
importa HTTP ni SQLite; el núcleo de TypeScript nunca importa React, Tauri ni
ECharts.

Las reglas son ejecutables, no solo prosa: `pipeline` usa contratos de
import-linter, `crates/indicators-core/tests/architecture.rs` analiza los tokens
del código fuente y el grafo de dependencias de Cargo, y
`src/architecture.test.ts` (T6) construye el grafo de imports de TypeScript. Los
DTO del wire son los propios tipos de dominio de Rust (`serde` más `ts-rs`), así
que existe una única fuente de verdad para el contrato IPC; el adaptador de
TypeScript los mapea a su modelo de dominio con marca (branded). Es una
compensación deliberada: una capa de DTO duplicada agregaría riesgo de desviación
sin agregar seguridad.

## Consecuencias

- Los servicios se prueban con dobles en memoria y con archivos SQLite temporales
  reales, sin runtime de escritorio. Las pruebas del shell usan
  `tauri::test::mock_builder` y el mismo manejador de comandos que llama la UI.
- Agregar comportamiento solo de UI debe pasar por un caso de uso o quedarse en
  `src/ui`; las pruebas de arquitectura fallan ante importaciones en sentido
  inverso.
- El shell solo puede crecer a través de puertos: una nueva integración con el
  sistema operativo implica un nuevo trait en el núcleo más un adaptador, no una
  llamada desde un componente.
- La compensación es que los tipos de dominio de Rust llevan preocupaciones del
  wire (`serde`, `ts-rs`). Se acepta porque la alternativa duplica cada campo en
  una segunda capa de DTO y crea una segunda superficie de desviación.

## Alternativas

- **Shell de Tauri "gordo"**: lo más rápido de escribir, pero ata toda la lógica
  al runtime de escritorio y hace imposible el ciclo rápido de pruebas de
  TypeScript.
- **Crate separado de DTO para IPC**: aísla los tipos del wire, pero duplica el
  contrato y requiere pruebas de mapeo en ambas direcciones.
- **Una capa de repositorio compartida por todos los runtimes**: imposible entre
  lenguajes y ocultaría la frontera de SQLite que exige S34.
