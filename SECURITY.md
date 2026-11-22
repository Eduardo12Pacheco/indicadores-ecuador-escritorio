# Security policy

## Reporting a vulnerability

Report security issues privately through
[GitHub Security Advisories](https://github.com/Eduardo12Pacheco/indicadores-ecuador-escritorio/security/advisories/new).
Do not open a public issue for an unfixed vulnerability. Include the affected
version, the operating system, a minimal reproduction and the impact you
observed. Reports are acknowledged on a best-effort basis; this is a
maintainer-run portfolio project without a paid bug-bounty program.

## Supported versions

Security fixes are applied to the latest published release and to `main`.
Older releases are not maintained.

| Version | Supported |
|---|---|
| 0.1.x (current) | yes |
| older | no |

## Privacy

- No accounts, telemetry, analytics, crash uploads or advertising identifiers.
- The application does not open a socket except for the optional update check
  (`UpdateService::check`), which is off by default. When enabled it requests
  the public GitHub release feed at most once every 24 hours, shows the version
  and a link, and never downloads or installs anything.
- Saved views and settings stay in `user.db` in the app data directory; exports
  are written only to the path the user chooses in the native save dialog.
- The bundled dataset contains country-level World Bank statistics, not personal
  data.

## Threat model

The application is a local desktop app with a Tauri webview. The relevant
boundaries and mitigations are:

| Asset / boundary | Mitigation |
|---|---|
| Webview to native IPC | Only the 14 registered commands are exposed; every payload is validated in Rust and in TypeScript with zod. Errors use the stable `ErrorDto` codes instead of leaking internals. |
| Custom snapshot file | Opened read-only (`SQLITE_OPEN_READ_ONLY`, `PRAGMA query_only = ON`) after validating `user_version`, `meta.schema_version`, required tables and `PRAGMA quick_check`. An invalid file leaves the previous dataset active. |
| Export destination | The Rust core accepts only `.csv` and `.png` paths, requires a file name, caps content at 50 MiB and writes through a temporary file plus rename. |
| Tauri capabilities | No filesystem, shell or HTTP plugin. Dialog and opener are the only extra permissions; the opener is scoped to an explicit allowlist of GitHub, World Bank and Creative Commons URLs. |
| Remote content | Strict CSP: `default-src 'self'`, `connect-src ipc: http://ipc.localhost`, no remote scripts, styles, fonts or images. Fonts are vendored locally. |
| Update check | Opt-in, notify-only, no auto-download, semver comparison, errors surfaced without retry loops. The feed URL can be overridden for tests, not by untrusted input. |
| Supply chain | Lockfiles for npm, Cargo and uv; `npm audit`, `cargo audit`, `cargo deny`, `pip-audit` and gitleaks in CI; checksums and GitHub build-provenance attestations on releases. |
| Downloaded installers | Builds are unsigned (documented in `docs/INSTALL.md`), so users must verify `SHA256SUMS.txt` or `gh attestation verify` before trusting a file obtained outside the release page. |

## Out of scope

- An attacker with control of the user's OS account, the desktop session or the
  downloaded binary before checksum verification.
- Vulnerabilities in the user's installed WebView2/WebKitGTK runtime or GPU
  driver.
- Denial of service through an extremely large custom snapshot chosen by the
  user; validation rejects invalid schemas but the app does not impose a file
  size limit on that path.
- The unsigned-build warnings themselves (SmartScreen, Smart App Control,
  Gatekeeper); they are an honest distribution trade-off documented in
  [docs/INSTALL.md](docs/INSTALL.md), not a vulnerability.

## Dependency and disclosure policy

Dependencies are audited in CI and pinned by lockfiles. A report that only
affects an outdated dependency is still useful: include the advisory id and the
affected package/version. Fixes ship as a patch release; the release page and
the opt-in update notification are the disclosure channel. Please give the
maintainer reasonable time to ship a fix before publishing details.
