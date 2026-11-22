# Política de seguridad

## Reportar una vulnerabilidad

Repórtala de forma privada a través de
[GitHub Security Advisories](https://github.com/Eduardo12Pacheco/indicadores-ecuador-escritorio/security/advisories/new).
No abras una incidencia pública por una vulnerabilidad sin corregir. Incluye la versión
afectada, el sistema operativo, una reproducción mínima y el impacto que observaste. Los
reportes se confirman con base en el mejor esfuerzo; este es un proyecto de portafolio mantenido
por su autor, sin un programa de recompensas por errores pagado.

## Versiones soportadas

Las correcciones de seguridad se aplican a la última release publicada y a `main`. Las versiones
anteriores no se mantienen.

| Versión | Soportada |
|---|---|
| 0.1.x (actual) | sí |
| anteriores | no |

## Privacidad

- Sin cuentas, telemetría, analítica, envío de reportes de fallos ni identificadores
  publicitarios.
- La aplicación no abre ningún socket, salvo la comprobación opcional de actualizaciones
  (`UpdateService::check`), que está desactivada por defecto. Cuando está activada, solicita el
  feed público de releases de GitHub como máximo una vez cada 24 horas, muestra la versión y un
  enlace, y nunca descarga ni instala nada.
- Las vistas guardadas y los ajustes permanecen en `user.db`, dentro del directorio de datos de
  la aplicación; las exportaciones se escriben solo en la ruta que la persona usuaria elige en el
  diálogo nativo de guardado.
- El conjunto de datos incluido contiene estadísticas del Banco Mundial a nivel de país, no datos
  personales.

## Modelo de amenazas

La aplicación es una app de escritorio local con un webview de Tauri. Las fronteras relevantes y
sus mitigaciones son:

| Activo o frontera | Mitigación |
|---|---|
| Webview hacia IPC nativo | Solo se exponen los 14 comandos registrados; cada payload se valida en Rust y en TypeScript con zod. Los errores usan los códigos estables de `ErrorDto` en lugar de filtrar detalles internos. |
| Archivo de instantánea personalizada | Se abre en modo solo lectura (`SQLITE_OPEN_READ_ONLY`, `PRAGMA query_only = ON`) después de validar `user_version`, `meta.schema_version`, las tablas obligatorias y `PRAGMA quick_check`. Un archivo inválido deja activo el conjunto de datos anterior. |
| Destino de exportación | El núcleo de Rust acepta solo rutas `.csv` y `.png`, exige un nombre de archivo, limita el contenido a 50 MiB y escribe a través de un archivo temporal seguido de un renombrado. |
| Capabilities de Tauri | Sin plugins de sistema de archivos, shell ni HTTP. Dialog y opener son los únicos permisos adicionales; opener está limitado a una lista explícita de URLs de GitHub, del Banco Mundial y de Creative Commons. |
| Contenido remoto | CSP estricta: `default-src 'self'`, `connect-src ipc: http://ipc.localhost`, sin scripts, estilos, fuentes ni imágenes remotos. Las fuentes se incluyen localmente. |
| Comprobación de actualizaciones | Optativa, solo de notificación, sin descarga automática, comparación semver y errores visibles sin bucles de reintento. La URL del feed puede sobrescribirse para las pruebas, nunca por una entrada no confiable. |
| Cadena de suministro | Lockfiles para npm, Cargo y uv; `npm audit`, `cargo audit`, `cargo deny`, `pip-audit` y gitleaks en CI; checksums y atestaciones de procedencia del build de GitHub en las releases. |
| Instaladores descargados | Los builds no están firmados (documentado en `docs/INSTALL.md`), así que las personas usuarias deben verificar `SHA256SUMS.txt` o `gh attestation verify` antes de confiar en un archivo obtenido fuera de la página de releases. |

## Fuera de alcance

- Un atacante con control de la cuenta del sistema operativo de la persona usuaria, de la sesión
  de escritorio o del binario descargado antes de la verificación del checksum.
- Vulnerabilidades en el runtime de WebView2 o WebKitGTK instalado por la persona usuaria, o en
  el driver gráfico.
- Denegación de servicio mediante una instantánea personalizada extremadamente grande elegida
  por la persona usuaria; la validación rechaza los esquemas inválidos, pero la app no impone un
  límite de tamaño de archivo en esa ruta.
- Las advertencias de los builds sin firma en sí mismas (SmartScreen, Smart App Control,
  Gatekeeper); son una compensación de distribución documentada con honestidad en
  [docs/INSTALL.md](docs/INSTALL.md), no una vulnerabilidad.

## Política de dependencias y divulgación

Las dependencias se auditan en CI y se fijan mediante lockfiles. Un reporte que solo afecta a una
dependencia desactualizada sigue siendo útil: incluye el id del advisory y el paquete y la versión
afectados. Las correcciones se publican como release de parche; la página de releases y la
notificación opcional de actualización son el canal de divulgación. Concede a la persona
mantenedora un plazo razonable para publicar una corrección antes de difundir los detalles.
