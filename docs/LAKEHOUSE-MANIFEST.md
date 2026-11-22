# Manifiesto lakehouse v1

Ecuador Indicators puede importar una instantánea desde un lakehouse hermano que guarda sus
datos en DuckDB. La integración es opcional y exclusiva de Python: el runtime de escritorio
nunca enlaza DuckDB. El contrato es un manifiesto JSON que describe el archivo DuckDB y mapea
sus relaciones y columnas a las tablas de la instantánea schema-v1. La definición legible por
máquina está en
[`pipeline/schemas/lakehouse-manifest.v1.schema.json`](../pipeline/schemas/lakehouse-manifest.v1.schema.json)
(JSON Schema draft 2020-12); el ADR 0009 registra por qué el contrato tiene esa forma.

Es un contrato propuesto: cuando se escribió, no existía ningún artefacto lakehouse hermano con
el que alinearse.

## Comando

```bash
cd pipeline
uv sync --extra lakehouse
uv run ecuador-data import-lakehouse \
  --manifest ../sibling-lakehouse/manifest.json \
  --out ../data/snapshot/from-lakehouse.sqlite
```

El resultado es una instantánea schema-v1 normal que la aplicación de escritorio puede abrir
desde **Ajustes → Conjunto de datos → abrir instantánea**. `import-lakehouse` no modifica
`data/MANIFEST.json`; solo escribe el archivo de salida solicitado.

## Forma

```json
{
  "manifest_version": "1.0",
  "kind": "ecuador-indicators-lakehouse-export",
  "generated_at": "2026-11-20T06:00:00+00:00",
  "dataset": {
    "id": "sibling-lakehouse",
    "version": "2026.11",
    "title": "Sibling lakehouse export"
  },
  "license": {
    "spdx": "CC-BY-4.0",
    "url": "https://creativecommons.org/licenses/by/4.0/",
    "attribution_en": "Source: sibling lakehouse export, CC BY 4.0.",
    "attribution_es": "Fuente: exportación del lakehouse hermano, CC BY 4.0."
  },
  "duckdb": {
    "path": "export.duckdb",
    "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "relations": {
    "topics": {
      "relation": "lakehouse.topic",
      "columns": {
        "id": "id",
        "name_en": "name_en",
        "name_es": "name_es",
        "sort_order": "sort_order"
      }
    },
    "geographies": {
      "relation": "lakehouse.geography",
      "columns": {
        "iso3": "iso3",
        "iso2": "iso2",
        "name_en": "name_en",
        "name_es": "name_es",
        "is_aggregate": "is_aggregate",
        "sort_order": "sort_order"
      }
    },
    "indicators": {
      "relation": "lakehouse.indicator",
      "columns": {
        "code": "code",
        "topic_id": "topic_id",
        "name_en": "name_en",
        "name_es": "name_es",
        "description_en": "description_en",
        "description_es": "description_es",
        "unit_en": "unit_en",
        "unit_es": "unit_es",
        "value_kind": "value_kind",
        "decimals": "decimals",
        "higher_is": "higher_is",
        "source_org_en": "source_org_en",
        "source_org_es": "source_org_es",
        "sort_order": "sort_order"
      }
    },
    "observations": {
      "relation": "lakehouse.observation",
      "columns": {
        "indicator_code": "indicator_code",
        "iso3": "iso3",
        "year": "year",
        "value": "value"
      }
    }
  }
}
```

## Campos

| Campo | Reglas |
|---|---|
| `manifest_version` | `1.<minor>`, con ambas partes numéricas. Una versión mayor distinta se rechaza. |
| `kind` | Debe ser `ecuador-indicators-lakehouse-export`. |
| `generated_at` | Marca de tiempo ISO-8601 con desplazamiento UTC; se convierte en `source_last_updated` y `retrieved_at` de la instantánea. |
| `dataset.id`, `dataset.version`, `dataset.title` | Cadenas no vacías que se copian a `meta.dataset_id`, `meta.dataset_version` y `meta.source_name`. |
| `license.spdx`, `license.url` | Se copian a `meta.license` y `meta.license_url`. |
| `license.attribution_en`, `license.attribution_es` | No vacías; se copian tal cual a `meta.attribution_en` y `meta.attribution_es`. |
| `duckdb.path` | Relativa al directorio del manifiesto; las rutas absolutas y los segmentos `..` se rechazan. |
| `duckdb.sha256` | SHA-256 en hexadecimal en minúsculas de los bytes del archivo DuckDB. |
| `relations.<table>.relation` | `table` o `schema.table`; cada parte cumple `^[A-Za-z_][A-Za-z0-9_]*$`. |
| `relations.<table>.columns` | Mapeo exacto de cada columna de la instantánea de esa tabla a una columna física de DuckDB. Las claves faltantes o adicionales se rechazan; cada nombre físico cumple `^[A-Za-z_][A-Za-z0-9_]*$`. |

Las tablas de la instantánea y sus columnas son las del esquema-v1 documentado en
[`docs/DATA.md`](DATA.md): `topic`, `geography`, `indicator` y `observation` (`meta` lo genera
el pipeline, no se importa).

## Validación y errores

El manifiesto se analiza y valida antes de abrir el archivo DuckDB. DuckDB se abre con
`read_only=True`; las relaciones se leen con las columnas mapeadas y se ordenan por sus claves
primarias. La integridad referencial se comprueba antes de escribir: los indicadores deben
referenciar un tema conocido, las observaciones deben referenciar un indicador y una geografía
conocidos, y las claves de observación duplicadas se rechazan.

Todos los fallos de contrato y de datos terminan con código `2` e imprimen un mensaje que
nombra el archivo, la relación o la columna. Los fallos inesperados terminan con código `1`.

| Condición | Mensaje (resumido) |
|---|---|
| Manifiesto ausente, ilegible o JSON inválido | `lakehouse manifest not found: manifest.json` / `... is not valid JSON` |
| Versión mayor no soportada | `invalid lakehouse manifest: ... manifest_version major must be 1` |
| `kind` incorrecto | `invalid lakehouse manifest: ... kind` |
| Mapeo de columnas faltante o adicional | `invalid lakehouse manifest: ... missing column mapping for observations: year` |
| Identificador de relación o columna inseguro | `invalid lakehouse manifest: ... unsafe column identifier` |
| Ruta de DuckDB absoluta o que sale del directorio | `lakehouse duckdb path must be relative to the manifest` |
| Archivo DuckDB ausente | `lakehouse duckdb not found: export.duckdb` |
| Checksum no coincide | `lakehouse duckdb checksum mismatch: export.duckdb expected=... actual=...` |
| Relación o columna física ausente | `lakehouse relation lakehouse.topic cannot be read with the mapped columns: ...` |
| Valores de fila inválidos | `lakehouse topics contain invalid rows: ...` |
| Referencia colgante o clave duplicada | `lakehouse observation references unknown indicator ...` |
| Extra de DuckDB no instalado | `duckdb is not installed; install the lakehouse extra with `uv sync --extra lakehouse`` |

## Versionado

La versión mayor cambia solo cuando un productor debe cambiar su manifiesto de forma
incompatible. Las versiones menores pueden agregar campos opcionales en una revisión futura del
contrato. El analizador actual rechaza campos desconocidos a propósito (validación estricta para
un contrato propuesto), así que agregar un campo requiere un cambio coordinado del analizador y
una nueva versión menor. Cuando exista un productor real, una versión mayor posterior podrá
relajar el manejo de campos desconocidos.
