# Publicación

La release se dispara con tags y la automatiza por completo
[`.github/workflows/release.yml`](../.github/workflows/release.yml). No hay un paso de
carga manual ni una rama de release. Esta página registra el procedimiento que sigue la
persona mantenedora y la lista de verificación usada para aceptar una release.

## Cómo funciona el workflow

| Job | Runner | Qué hace |
|---|---|---|
| `verify` | `ubuntu-latest` | comprueba que `package.json`, `Cargo.toml`, `src-tauri/tauri.conf.json` y `pipeline/pyproject.toml` comparten una sola versión y, en un tag, que el tag coincide con ella |
| `build` | matriz | compila Linux x64 en `ubuntu-22.04`, Windows x64 en `windows-latest` y macOS arm64 y x64 en `macos-latest`; recolecta los instaladores con `scripts/collect-artifacts.mjs` |
| `smoke-linux` | `ubuntu-22.04` | instala el `.deb`, ejecuta `--self-check` bajo xvfb, verifica el informe y luego ejecuta el AppImage |
| `smoke-windows` | `windows-latest` | instala el paquete NSIS con `/S`, localiza el ejecutable, ejecuta `--self-check`, extrae el MSI de forma administrativa y repite la prueba |
| `smoke-macos-arm64` | `macos-latest` | monta el `.dmg` arm64, ejecuta `--self-check` de la app y lo desmonta |
| `smoke-macos-x64` | `macos-15-intel` | igual, para el `.dmg` de Intel |
| `publish` | `ubuntu-latest` | solo en tags `v*`: descarga todos los instaladores, escribe `SHA256SUMS.txt`, genera las notas con git-cliff, atestigua la procedencia y crea la release de GitHub |

Un dispatch manual (`workflow_dispatch`) compila y prueba con humo todos los instaladores,
pero omite `publish` porque ese job requiere una referencia de tag. El input `dry_run` tiene
por defecto el valor `true` y documenta esa intención.

## Preparar una release

1. Verifica que `main` esté en verde y que todos los cambios estén integrados.
2. Sube de versión los cuatro manifiestos de forma atómica y verifícalos:

   ```bash
   node scripts/bump-version.mjs 0.2.0
   node scripts/bump-version.mjs --check
   ```

3. Regenera el changelog a partir de Conventional Commits (el tag solo se usa como
   encabezado de sección; todavía no lo crees):

   ```bash
   npx --yes git-cliff@2.14.2 --config cliff.toml --tag v0.2.0 -o CHANGELOG.md
   ```

4. Revisa `CHANGELOG.md`, confirma juntos la subida de versión y el changelog, y envía los
   cambios:

   ```bash
   git add package.json Cargo.toml src-tauri/tauri.conf.json pipeline/pyproject.toml CHANGELOG.md
   git commit -m "chore(release): prepare 0.2.0"
   git push origin main
   ```

5. Ejecuta el dry run antes de etiquetar:

   ```bash
   gh workflow run release.yml -f dry_run=true
   gh run list --workflow=release.yml --limit 1
   gh run watch <run-id> --exit-status
   ```

6. Cuando el dry run esté en verde y la persona propietaria apruebe la versión, crea el tag
   y envíalo:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

El envío del tag inicia el mismo workflow; esta vez `publish` crea la release. Un tag con
sufijo `-`, por ejemplo `v0.2.0-rc.1`, se publica como prerelease.

## Verificar la release publicada

- El job `verify` imprimió `versions in sync: 0.2.0`.
- Los cuatro jobs de build y los cuatro de humo tuvieron éxito; una prueba de humo fallida
  significa que el instalador no se publica.
- La release contiene exactamente estos assets (además de `SHA256SUMS.txt` y de las notas
  generadas en el cuerpo de la release):

  ```text
  ecuador-indicators_0.2.0_linux_x64.deb
  ecuador-indicators_0.2.0_linux_x64.rpm
  ecuador-indicators_0.2.0_linux_x64.AppImage
  ecuador-indicators_0.2.0_windows_x64.exe
  ecuador-indicators_0.2.0_windows_x64.msi
  ecuador-indicators_0.2.0_macos_arm64.dmg
  ecuador-indicators_0.2.0_macos_x64.dmg
  SHA256SUMS.txt
  ```

- `SHA256SUMS.txt` lista cada instalador y se verifica localmente:

  ```bash
  sha256sum -c SHA256SUMS.txt
  ```

- La procedencia se verifica:

  ```bash
  gh attestation verify ecuador-indicators_0.2.0_linux_x64.deb \
    --repo Eduardo12Pacheco/indicadores-ecuador-escritorio
  ```

- Las notas de la release tienen las secciones Features, Bug Fixes, Documentation, Tests y
  Maintenance según corresponda (son los nombres que genera git-cliff). Los `??` o los grupos
  vacíos indican que el historial de commits incumplió la convención de Conventional Commits.
- Descarga un instalador en cada sistema operativo y sigue [`INSTALL.md`](INSTALL.md); las
  advertencias del build sin firma deben coincidir con esa guía.

## Revertir

Si una release está mal, desepublícala antes de que las personas la instalen:

```bash
gh release delete v0.2.0 --yes
git push origin :refs/tags/v0.2.0
git tag -d v0.2.0
```

Corrige el problema en `main`, sube a una nueva versión de parche y repite el procedimiento.
No borres una release que las personas usuarias puedan haber instalado sin publicar un
reemplazo; la app no tiene actualizador automático, así que las personas solo se enteran de
una corrección mediante la comprobación opcional de solo notificación o la página de
releases.

## Por qué no hay actualizador automático

`tauri-plugin-updater` requiere un par de claves de firma de actualizaciones y un contrato
`latest.json` alojado. La custodia de claves y los secretos chocan con la restricción del
proyecto de "cero claves obligatorias", y los instaladores no están firmados de todos modos
(ADR 0008). En su lugar, la app realiza una comprobación de versión **opcional y solo de
notificación** contra la API de releases de GitHub y enlaza a la página de la release; nunca
descarga ni instala una actualización. Activar la comprobación es un solo ajuste y está
desactivada por defecto.

## Verificaciones locales de la release

Antes de etiquetar, los mismos controles pueden reproducirse localmente:

```bash
npm run verify
node scripts/collect-artifacts.mjs \
  --version 0.1.0 --platform linux --arch x64 \
  --target-dir target/release/bundle --out "$(mktemp -d)"
npx --yes git-cliff@2.14.2 --config cliff.toml --unreleased --strip header
```

`npx tauri build --bundles deb` produce localmente el paquete Debian; los builds de RPM y
AppImage pueden necesitar herramientas adicionales del host, por eso el workflow los compila
en el runner nativo de Linux.
