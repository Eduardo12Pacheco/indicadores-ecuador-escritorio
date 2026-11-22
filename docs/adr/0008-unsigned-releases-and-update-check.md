# ADR 0008 — Unsigned releases and the notify-only update check

## Status

Accepted (T14, 2026-11-20). Supersedes nothing; implements D17 and D20.

## Context

The desktop application is distributed as L3 installers from GitHub Releases
(S29). Signing the builds would require Apple Developer ID and Windows
code-signing certificates, secret custody in CI, notarization credentials and a
renewal process. The project's constraints are local-first, zero mandatory keys
and no paid APIs, and the owner cannot provide certificates for this portfolio
project. The builds are therefore unsigned, and the documentation must be
honest about what users will see instead of hiding the warning.

Updating is a related question. `tauri-plugin-updater` needs a public key in the
app, a private key in CI and a `latest.json` contract. A key that cannot be
protected (or that is protected by an account the project does not have) makes
the update channel a supply-chain liability: an attacker who obtains the key can
push arbitrary code to every installation. Tauri documents the updater as
requiring signing even when the installers themselves are unsigned.

Evidence checked on 2026-11-19:

- Tauri macOS signing guide <https://v2.tauri.app/distribute/sign/macos/>:
  unsigned apps warn on launch, ad-hoc signing (`signingIdentity: "-"`) is
  required on Apple Silicon for internet-downloaded apps, and the user must
  still approve the app in System Settings → Privacy & Security → "Open
  Anyway". Apple's documented path:
  <https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac>.
- Tauri Windows signing guide <https://v2.tauri.app/distribute/sign/windows/>:
  unsigned installers trigger SmartScreen ("More info" → "Run anyway"), and
  Windows 11 Smart App Control can block unknown unsigned applications outright;
  Smart App Control can only be disabled globally.
- Tauri updater documentation and the plugin's own requirements: signing keys
  and a release manifest are mandatory.
- Tauri Linux packaging guide: `.deb`, `.rpm` and `.AppImage` are the supported
  artifacts for the configured bundle targets.

## Decision

1. **Ship unsigned, documented builds.** The release workflow builds NSIS
   (`-setup.exe`) and MSI on Windows, DMG on macOS arm64 and x64, and `.deb`,
   `.rpm` and `.AppImage` on Linux. macOS uses ad-hoc signing
   (`bundle.macOS.signingIdentity = "-"`) and is not notarized. No certificate
   or signing secret exists in the repository or CI.
2. **Publish verifiability instead of signatures.** Every release publishes
   `SHA256SUMS.txt` and an `actions/attest-build-provenance` attestation, and
   `docs/INSTALL.md` documents checksum verification and
   `gh attestation verify`. The release notes are generated from Conventional
   Commits with git-cliff so the artifact history is auditable.
3. **Smoke-test every installer before publishing.** Each installer is
   installed on a clean runner and must pass
   `ecuador-indicators --self-check`. The publish job depends on all four smoke
   jobs, so a broken artifact cannot be published.
4. **No auto-updater.** The app contains a notify-only update check: opt-in,
   off by default, throttled to once every 24 hours at launch, and it only
   displays the version and a link that opens in the system browser. It never
   downloads or executes an update. The release feed is
   `https://api.github.com/repos/Eduardo12Pacheco/indicadores-ecuador-escritorio/releases/latest`,
   overridable with `ECUADOR_INDICATORS_UPDATE_URL` for tests.
5. **Document the limitations above the fold.** `docs/INSTALL.md` explains the
   SmartScreen and Smart App Control behavior, the macOS Gatekeeper approval,
   the Linux package formats, uninstall and the app's privacy stance.

## Consequences

- Users must approve the app the first time on macOS and click through
  SmartScreen on Windows. Some Windows 11 machines with Smart App Control
  enabled (the default for new consumer installations in some regions) cannot
  run the app without turning that feature off globally; this is stated plainly
  rather than worked around.
- There is no silent update path. Security fixes reach users only through the
  release page and the opt-in notification. Releasing a new version is cheap
  (push a tag), but adoption is manual.
- The repository can be built and released without any secret beyond
  `GITHUB_TOKEN`; forks can reproduce the workflow.
- If the project later obtains certificates or an update key with proper
  custody, the upgrade path is: add `signingIdentity`/certificate secrets, notarize
  macOS, enable `tauri-plugin-updater` with a protected key and a signed
  `latest.json`, then remove the notify-only service behind the same
  `UpdateGateway` port. The UI already treats "available" and "up to date" as
  display-only states, so the change is confined to the adapter.

## Alternatives

- **Buy certificates and notarize now.** Rejected: cost, identity verification
  and secret custody are out of scope for a portfolio project, and the plan's
  hard constraint is zero mandatory keys.
- **Electron-style auto-update over plain HTTPS.** Rejected: it has the same
  key-custody problem with less platform support and conflicts with the Tauri
  stack decision (ADR 0001).
- **`tauri-plugin-updater` with a key committed to CI.** Rejected: a key in CI
  or the repository is not a trust boundary; it converts a signing inconvenience
  into a remote-code-execution channel.
- **Ad-hoc signing on macOS but not documenting it.** Rejected: users would
  meet an unexplained Gatekeeper block, which is exactly the kind of dishonest
  distribution S30 forbids.
