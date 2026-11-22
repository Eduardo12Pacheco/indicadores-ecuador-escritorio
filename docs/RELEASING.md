# Releasing

The release is tag-driven and fully automated by
[`.github/workflows/release.yml`](../.github/workflows/release.yml). There is no
manual upload step and no release branch. This page records the procedure the
maintainer follows and the checklist used to accept a release.

## How the workflow works

| Job | Runner | What it does |
|---|---|---|
| `verify` | `ubuntu-latest` | checks that `package.json`, `Cargo.toml`, `src-tauri/tauri.conf.json` and `pipeline/pyproject.toml` share one version and, on a tag, that the tag matches it |
| `build` | matrix | builds Linux x64 on `ubuntu-22.04`, Windows x64 on `windows-latest`, macOS arm64 and x64 on `macos-latest`; collects the installers with `scripts/collect-artifacts.mjs` |
| `smoke-linux` | `ubuntu-22.04` | installs the `.deb`, runs `--self-check` under xvfb, asserts the report, then runs the AppImage |
| `smoke-windows` | `windows-latest` | installs the NSIS package with `/S`, locates the executable, runs `--self-check`, extracts the MSI administratively and repeats |
| `smoke-macos-arm64` | `macos-latest` | mounts the arm64 `.dmg`, runs the app's `--self-check`, detaches |
| `smoke-macos-x64` | `macos-15-intel` | same for the Intel `.dmg` |
| `publish` | `ubuntu-latest` | only on `v*` tags: downloads every installer, writes `SHA256SUMS.txt`, generates notes with git-cliff, attests provenance and creates the GitHub Release |

A manual dispatch (`workflow_dispatch`) builds and smoke-tests every installer
but skips `publish` because the publish job requires a tag ref. The `dry_run`
input defaults to `true` and documents that intent.

## Prepare a release

1. Make sure `main` is green and every change is merged.
2. Bump the four manifests atomically and verify them:

   ```bash
   node scripts/bump-version.mjs 0.2.0
   node scripts/bump-version.mjs --check
   ```

3. Regenerate the changelog from Conventional Commits (the tag is only used as
   the section heading; do not create it yet):

   ```bash
   npx --yes git-cliff@2.14.2 --config cliff.toml --tag v0.2.0 -o CHANGELOG.md
   ```

4. Review `CHANGELOG.md`, commit the version bump and changelog together, and
   push:

   ```bash
   git add package.json Cargo.toml src-tauri/tauri.conf.json pipeline/pyproject.toml CHANGELOG.md
   git commit -m "chore(release): prepare 0.2.0"
   git push origin main
   ```

5. Run the dry run before tagging:

   ```bash
   gh workflow run release.yml -f dry_run=true
   gh run list --workflow=release.yml --limit 1
   gh run watch <run-id> --exit-status
   ```

6. When the dry run is green and the owner approves the version, create the
   tag and push it:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

The tag push starts the same workflow; this time `publish` creates the release.
A tag with a `-` suffix, for example `v0.2.0-rc.1`, is published as a
prerelease.

## Verify the published release

- The `verify` job printed `versions in sync: 0.2.0`.
- All four build jobs and all four smoke jobs succeeded; a failed smoke test
  means the installer is not published.
- The release contains exactly these assets (plus `SHA256SUMS.txt` and the
  generated notes in the release body):

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

- `SHA256SUMS.txt` lists every installer and verifies locally:

  ```bash
  sha256sum -c SHA256SUMS.txt
  ```

- Provenance verifies:

  ```bash
  gh attestation verify ecuador-indicators_0.2.0_linux_x64.deb \
    --repo Eduardo12Pacheco/indicadores-ecuador-escritorio
  ```

- The release notes have Features, Bug Fixes, Documentation, Tests and
  Maintenance sections as applicable; `??` or empty groups are a sign the
  commit history violated the Conventional Commits convention.
- Download one installer on each OS and follow
  [`INSTALL.md`](INSTALL.md); the unsigned-build warnings must match that guide.

## Rollback

If a release is wrong, unpublish it before users install it:

```bash
gh release delete v0.2.0 --yes
git push origin :refs/tags/v0.2.0
git tag -d v0.2.0
```

Fix the problem on `main`, bump to a new patch version and repeat the
procedure. Do not delete a release that users may already have installed
without publishing a replacement; the app has no auto-updater, so users only
learn about a fix through the opt-in notify-only check or the release page.

## Why there is no auto-updater

`tauri-plugin-updater` requires an update-signing key pair and a hosted
`latest.json` contract. Key custody and secrets conflict with the project's
"zero mandatory keys" constraint, and the installers are unsigned anyway
(ADR 0008). The app instead performs an **opt-in, notify-only** version check
against the GitHub releases API and links to the release page; it never
downloads or installs an update. Enabling the check is a single setting and is
off by default.

## Local release checks

Before tagging, the same gates can be reproduced locally:

```bash
npm run verify
node scripts/collect-artifacts.mjs \
  --version 0.1.0 --platform linux --arch x64 \
  --target-dir target/release/bundle --out "$(mktemp -d)"
npx --yes git-cliff@2.14.2 --config cliff.toml --unreleased --strip header
```

`npx tauri build --bundles deb` produces the Debian package locally; RPM and
AppImage builds may need additional host tools, which is why the workflow builds
them on the native Linux runner.
