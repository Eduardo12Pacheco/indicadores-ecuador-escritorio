# ADR 0008 — Releases sin firma y comprobación de actualizaciones solo de notificación

## Estado

Aceptada (T14, 2026-11-20). No reemplaza ninguna decisión anterior; implementa D17 y
D20.

## Contexto

La aplicación de escritorio se distribuye como instaladores L3 desde GitHub Releases
(S29). Firmar los builds requeriría un Developer ID de Apple y certificados de firma de
código de Windows, custodia de secretos en CI, credenciales de notarización y un proceso
de renovación. Las restricciones del proyecto son local-first, cero claves obligatorias
y sin APIs de pago, y el propietario no puede proporcionar certificados para este
proyecto de portafolio. Por eso los builds no están firmados, y la documentación debe
ser honesta sobre lo que verán las personas usuarias en lugar de ocultar la advertencia.

Actualizar es una cuestión relacionada. `tauri-plugin-updater` necesita una clave pública
en la app, una clave privada en CI y un contrato `latest.json`. Una clave que no puede
protegerse (o que está protegida por una cuenta que el proyecto no tiene) convierte el
canal de actualización en un riesgo de cadena de suministro: quien obtenga la clave puede
enviar código arbitrario a cada instalación. Tauri documenta que el updater requiere
firma incluso cuando los instaladores en sí no están firmados.

Evidencia verificada el 2026-11-19:

- Guía de firma de Tauri para macOS <https://v2.tauri.app/distribute/sign/macos/>: las
  apps sin firma muestran una advertencia al abrirse; la firma ad-hoc
  (`signingIdentity: "-"`) es necesaria en Apple Silicon para apps descargadas de
  internet, y la persona usuaria aún debe aprobar la app en Ajustes del Sistema →
  Privacidad y seguridad, con la opción "Open Anyway" (etiqueta en inglés). Ruta
  documentada por Apple:
  <https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac>.
- Guía de firma de Tauri para Windows <https://v2.tauri.app/distribute/sign/windows/>:
  los instaladores sin firma activan SmartScreen ("Más información" → "Ejecutar de todas
  formas"), y Smart App Control de Windows 11 puede bloquear por completo las
  aplicaciones desconocidas sin firma; Smart App Control solo puede desactivarse de forma
  global.
- Documentación del updater de Tauri y requisitos propios del plugin: las claves de firma
  y un manifiesto de release son obligatorios.
- Guía de empaquetado de Tauri para Linux: `.deb`, `.rpm` y `.AppImage` son los artefactos
  soportados para los targets de bundle configurados.

## Decisión

1. **Publicar builds sin firma y documentados.** El workflow de release construye NSIS
   (`-setup.exe`) y MSI en Windows, DMG en macOS arm64 y x64, y `.deb`, `.rpm` y
   `.AppImage` en Linux. macOS usa firma ad-hoc (`bundle.macOS.signingIdentity = "-"`) y
   no está notarizado. No existe ningún certificado ni secreto de firma en el repositorio
   ni en CI.
2. **Publicar verificabilidad en lugar de firmas.** Cada release publica `SHA256SUMS.txt`
   y una atestación `actions/attest-build-provenance`, y `docs/INSTALL.md` documenta la
   verificación de checksums y `gh attestation verify`. Las notas de release se generan
   a partir de Conventional Commits con git-cliff para que el historial de artefactos sea
   auditable.
3. **Probar con humo cada instalador antes de publicar.** Cada instalador se instala en un
   runner limpio y debe pasar `ecuador-indicators --self-check`. El job de publicación
   depende de los cuatro jobs de humo, así que un artefacto roto no puede publicarse.
4. **Sin actualizador automático.** La app contiene una comprobación de actualizaciones
   solo de notificación: optativa, desactivada por defecto, limitada a una vez cada 24
   horas al iniciar, y solo muestra la versión y un enlace que se abre en el navegador del
   sistema. Nunca descarga ni ejecuta una actualización. El feed de releases es
   `https://api.github.com/repos/Eduardo12Pacheco/indicadores-ecuador-escritorio/releases/latest`,
   sobrescribible con `ECUADOR_INDICATORS_UPDATE_URL` para las pruebas.
5. **Documentar las limitaciones en primer plano.** `docs/INSTALL.md` explica el
   comportamiento de SmartScreen y de Smart App Control, la aprobación de Gatekeeper en
   macOS, los formatos de paquete de Linux, la desinstalación y la postura de privacidad
   de la app.

## Consecuencias

- Las personas usuarias deben aprobar la app la primera vez en macOS y continuar a través
  de SmartScreen en Windows. Algunas máquinas con Windows 11 y Smart App Control activado
  (el valor por defecto en instalaciones de consumo nuevas en algunas regiones) no pueden
  ejecutar la app sin desactivar esa función de forma global; esto se indica de forma
  explícita en lugar de evitarlo.
- No existe una ruta de actualización silenciosa. Las correcciones de seguridad llegan a
  las personas usuarias solo a través de la página de releases y de la notificación
  opcional. Publicar una nueva versión es barato (basta con enviar un tag), pero la
  adopción es manual.
- El repositorio puede compilarse y publicarse sin más secreto que `GITHUB_TOKEN`; los
  forks pueden reproducir el workflow.
- Si en el futuro el proyecto obtiene certificados o una clave de actualización con
  custodia adecuada, la ruta de mejora es: agregar `signingIdentity` y los secretos de
  certificado, notarizar macOS, habilitar `tauri-plugin-updater` con una clave protegida y
  un `latest.json` firmado, y luego retirar el servicio de solo notificación detrás del
  mismo puerto `UpdateGateway`. La UI ya trata "disponible" y "al día" como estados solo de
  visualización, así que el cambio queda confinado al adaptador.

## Alternativas

- **Comprar certificados y notarizar desde ya.** Descartado: el costo, la verificación de
  identidad y la custodia de secretos quedan fuera del alcance de un proyecto de portafolio,
  y la restricción principal del plan es cero claves obligatorias.
- **Actualización automática estilo Electron sobre HTTPS simple.** Descartada: tiene el
  mismo problema de custodia de claves con menor soporte de plataforma y entra en conflicto
  con la decisión de stack de Tauri (ADR 0001).
- **`tauri-plugin-updater` con una clave versionada en CI.** Descartado: una clave en CI o
  en el repositorio no es un límite de confianza; convierte un inconveniente de firma en un
  canal de ejecución remota de código.
- **Firma ad-hoc en macOS sin documentarla.** Descartado: las personas usuarias encontrarían
  un bloqueo de Gatekeeper sin explicación, exactamente el tipo de distribución deshonesta
  que prohíbe S30.
