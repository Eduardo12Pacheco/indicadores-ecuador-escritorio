# ADR 0009: Contrato del manifiesto lakehouse v1

## Estado

Aceptada. El contrato lo propone este repositorio: cuando se escribió no existía
ningún artefacto lakehouse hermano con el que alinearse.

## Contexto

La integración lakehouse opcional debe permitir que un proyecto hermano exporte datos
desde DuckDB hacia una instantánea de Ecuador Indicators sin enlazar DuckDB en el
runtime de escritorio. La aplicación se distribuye en tres sistemas operativos, y un
build nativo de DuckDB agregaría costo de empaquetado, tamaño y mantenimiento para una
función opcional. La integración también necesita una frontera estable, documentada y
versionada, en lugar de conocimiento SQL ad hoc de un repositorio hermano.

## Decisión

Definir un manifiesto JSON, versión `1.x`, que describe un archivo DuckDB y mapea sus
relaciones y columnas a las cinco tablas de la instantánea schema-v1. El contrato
completo está en [`docs/LAKEHOUSE-MANIFEST.md`](../LAKEHOUSE-MANIFEST.md) y está
codificado en
[`pipeline/schemas/lakehouse-manifest.v1.schema.json`](../../pipeline/schemas/lakehouse-manifest.v1.schema.json)
(JSON Schema draft 2020-12).

Puntos clave:

- La versión mayor de `manifest_version` debe ser `1`; una mayor distinta se rechaza. La
  versión menor es informativa, y futuras versiones menores pueden agregar campos
  opcionales.
- `kind` debe ser `ecuador-indicators-lakehouse-export`.
- `duckdb.path` es relativo al manifiesto y no puede salir de su directorio; los bytes del
  archivo deben coincidir con `duckdb.sha256`.
- Los identificadores de relaciones y columnas deben coincidir con
  `^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$`. Esto se valida antes de construir
  cualquier SQL, y los identificadores se citan, así que el contrato no tiene superficie de
  inyección SQL. DuckDB se abre con `read_only=True`.
- Los mapas de columnas son exactos: cada columna de la instantánea debe estar mapeada y no
  se acepta ningún mapeo adicional. Así los fallos quedan explícitos en lugar de descartar
  datos en silencio.
- La instantánea copia los textos de licencia y atribución del manifiesto y registra
  `origin = "lakehouse"`. Los demás campos de procedencia usan los metadatos del dataset del
  manifiesto (`title`, `version`, `generated_at`).
- Los fallos de validación terminan con código `2` a través de la CLI y señalan la relación o
  columna infractora. La falta de `duckdb` en el entorno también se informa como un error
  tipado; se instala con `uv sync --extra lakehouse` (es una dependencia de desarrollo, así
  que la suite de pruebas siempre lo tiene).

DuckDB sigue siendo una dependencia exclusiva de Python. El runtime de escritorio nunca lo
enlaza.

## Consecuencias

- El proyecto hermano debe producir este manifiesto y un archivo DuckDB; el contrato es el
  único acoplamiento y se versiona de forma independiente.
- Agregar una columna a la instantánea requiere una versión menor del manifiesto y un cambio
  coordinado aquí; el archivo de esquema y la validación del dominio se prueban uno contra el
  otro.
- La importación valida la integridad referencial (temas de indicadores, indicadores y
  geografías de las observaciones, claves de observación duplicadas) antes de escribir, así
  que una exportación defectuosa no puede producir una instantánea sutilmente corrupta.
- Una versión mayor futura puede cambiar nombres de columnas o agregar relaciones sin romper
  a los productores de la versión 1.

## Alternativas

- **Nombres fijos de tablas y columnas en el DuckDB hermano**: frágil, e imposible de
  versionar o documentar sin acoplarse a detalles del esquema.
- **Intercambio por Parquet o CSV**: pierde metadatos anidados y columnas tipadas; DuckDB ya
  es el formato de almacenamiento del proyecto hermano.
- **Enlazar DuckDB en el runtime de escritorio**: instaladores más pesados y builds nativos
  en tres sistemas operativos para una ruta opcional.
- **Leer SQL arbitrario desde el manifiesto**: conveniente, pero inseguro; el mapeo explícito
  se mantiene declarativo y validado.
