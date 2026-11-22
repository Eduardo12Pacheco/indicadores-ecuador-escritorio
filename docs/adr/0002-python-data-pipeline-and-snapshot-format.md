# ADR 0002: Pipeline de datos en Python e instantánea schema-v1

## Estado

Aceptada

## Contexto

Ecuador Indicators incluye una instantánea offline de 38 World Development
Indicators del Banco Mundial para siete geografías. La instantánea debe ser
reproducible a partir de una caché raw versionada, debe poder verificarse byte a
byte y debe ser consumida en modo solo lectura por el runtime de escritorio. El
lenguaje más fuerte del propietario es Python, y el linaje de los datos debe ser
visible y comprobable de forma independiente a la aplicación de escritorio.

La API WDI v2 del Banco Mundial no necesita clave, devuelve JSON con paginación y
se publica bajo CC BY 4.0 con proveedores de origen por indicador. Los nombres y
descripciones existen en inglés y en español. Algunas series son estimaciones
modeladas y muchas tienen rezagos de reporte de varios años, así que el artefacto
debe registrar qué se obtuvo y cuándo, en lugar de sugerir que los años faltantes
son cero.

## Decisión

Mantener un paquete Python separado, `pipeline/` (`ecuador-data`), con las mismas
reglas hexagonales que los demás runtimes: un `domain` puro, casos de uso en
`application`, `ports` y `adapters`. Es responsable de cuatro artefactos y comandos:

- `refresh` obtiene los metadatos en inglés y español, y un archivo de
  observaciones por indicador desde `https://api.worldbank.org/v2`, escribe JSON
  canónico (`sort_keys`, separadores compactos, UTF-8, salto de línea final) en
  `data/raw/` y registra por archivo la URL, la hora de obtención, el tamaño en
  bytes y el SHA-256 en `data/MANIFEST.json`.
- `build` es offline y determinista: lee la caché raw, verifica cada archivo
  contra el manifiesto y escribe una base SQLite con esquema versión 1
  (`PRAGMA user_version = 1`, tablas `meta`, `topic`, `geography`, `indicator` y
  `observation`, todas `WITHOUT ROWID` salvo indicación contraria, con claves
  foráneas habilitadas).
- `verify` vuelve a revisar los checksums de la caché raw, el hash del archivo de
  la instantánea, el esquema, los conteos y el hash lógico recalculado, y termina
  con código `2` ante cualquier discrepancia.
- `export-json` deriva la forma JSON que usa el adaptador en memoria y los
  fixtures de prueba; `--subset mini` selecciona el catálogo versionado de seis
  indicadores y cinco geografías en `pipeline/catalog/mini.toml`.

Dos hashes cumplen funciones distintas. `meta.logical_sha256` se calcula sobre un
volcado de texto canónico y ordenado de cada tabla (topic, geography, indicator,
observation, meta sin el propio hash). Demuestra que el contenido es reproducible
desde la caché raw sin importar el orden de inserción de las filas ni la
disposición de páginas de SQLite. `data/MANIFEST.json` también registra el
SHA-256 de los bytes del archivo de la instantánea, lo que demuestra que el
archivo distribuido es el versionado. El runtime de Rust solo verifica el
esquema, los conteos y `PRAGMA quick_check`; deliberadamente no recalcula el hash
lógico, porque eso acoplaría dos lenguajes a una misma convención de formato de
punto flotante.

Los códigos de salida forman parte del contrato: `0` éxito, `1` error inesperado,
`2` fallo de integridad o de validación, `3` fuente no disponible o error de
protocolo.

## Consecuencias

- La caché raw y la instantánea están versionadas, así que quien contribuye puede
  ejecutar `build` y `verify` sin conexión. La compensación es el tamaño del
  repositorio (la caché raw ocupa unos pocos megabytes); son datos generados y
  nunca se editan a mano.
- El determinismo depende de JSON canónico como entrada e inserciones ordenadas.
  Los valores de punto flotante se guardan como números JSON y se formatean para
  el hash con `repr` de Python, que reproduce exactamente los doubles IEEE-754.
- El runtime de escritorio no tiene dependencias de Python ni de DuckDB: lee un
  archivo SQLite con un esquema fijo. Las instantáneas personalizadas deben cumplir
  el mismo esquema.
- Actualizar el conjunto de datos es un `refresh` explícito seguido de una revisión
  del diff generado en `data/`; la aplicación no puede cambiar datos en silencio.
- La licencia y la atribución del Banco Mundial viven en `meta` y en la pantalla
  Acerca de de la aplicación, no solo en la documentación del repositorio.

## Alternativas

- **Consultar la API en tiempo de ejecución**: rompe el enfoque offline-first (S1)
  y hace que el conjunto de datos no sea reproducible.
- **CSV como formato intermedio**: pierde tipos y metadatos anidados; el JSON
  canónico coincide con la forma de la API y es fácil de comparar.
- **Parquet o DuckDB como artefacto incluido**: más pesado para el runtime de
  escritorio y agrega una dependencia nativa en tres sistemas operativos sin
  beneficio para el usuario.
- **Un solo hash del archivo**: el hash cambia con la disposición de páginas de
  SQLite y no puede distinguir una instantánea reconstruida pero equivalente de
  un contenido modificado.
- **Sin caché raw en git**: ahorra espacio, pero hace que el build no sea
  verificable ni reproducible sin conexión.
