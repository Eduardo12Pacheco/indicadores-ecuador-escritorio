# Contributing

Ecuador Indicators is a local-first desktop app with three runtimes: TypeScript
(UI and domain), Rust (desktop shell and core services) and Python (data
pipeline). Contributions are welcome as focused pull requests that keep the
architecture and the tests honest.

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 26 recommended, `>=24` | npm 11 ships with Node; the repository does not use pnpm or corepack. |
| Rust | stable, `>=1.95` | `rustfmt` and `clippy` components. |
| uv | `>=0.11` | Python 3.12 is resolved by `.python-version`. |
| Tauri system packages | per OS | Windows: WebView2 and the MSVC build tools. macOS: Xcode Command Line Tools. Linux: `libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf`, `xdg-utils`. |

Optional: `gh` for releases and attestations, `cargo-deny`/`cargo-audit` for the
audit jobs, and `WebKitWebDriver` + `tauri-driver` for native E2E on Linux.

## Setup

```bash
git clone https://github.com/Eduardo12Pacheco/indicadores-ecuador-escritorio.git
cd indicadores-ecuador-escritorio
npm ci
cd pipeline && uv sync --frozen && cd ..
```

Windows (PowerShell) uses the same commands; `npm ci` and `uv sync` are
cross-platform. The pipeline commands below assume you are inside `pipeline/`
when they say so.

## Commands

| Area | Command |
|---|---|
| All local gates | `npm run verify` |
| Fast web loop | `npm run verify:fast` |
| Lint | `npm run lint` |
| Format | `npm run format` |
| Types | `npm run typecheck` |
| Unit and component tests | `npm test` |
| Coverage gates | `npm run test:cov` |
| Rust format, clippy and tests | `npm run verify:rust` |
| Pipeline lint, types, tests and imports | `npm run verify:pipeline` |
| Browser E2E | `npm run test:e2e` |
| Native E2E (Linux, prerequisites required) | `npm run e2e:native` |
| Data integrity | `npm run check:data` |
| Bindings drift | `npm run check:bindings` |
| Bundle budget | `npm run build && npm run check:bundle` |
| Production licences | `npm run check:licenses` |
| Measured metrics | `npm run metrics` |
| Regenerate screenshots and GIF | `npm run capture:media` |

Use `npm test -- <pattern>` for a focused Vitest run, `cargo test -p
indicators-core <name>` for Rust and `uv run pytest tests/unit/<file> -q` inside
`pipeline/` for Python. The full command matrix and CI mapping are in
[docs/TESTING.md](docs/TESTING.md).

## Repository rules

The dependency direction is binding and tested:

- TypeScript `core/domain` imports nothing outside itself; `core/application`
  may import the domain and its own ports; adapters may import the core; the
  UI may not import adapters, the composition root or `@tauri-apps/*`.
- Rust `domain`, `ports` and `application` may not import `rusqlite`, `ureq`,
  `tauri`, `std::fs`, `std::net` or `std::env`; those belong to adapters and the
  shell.
- Python `domain` may not import `httpx`, `duckdb` or `sqlite3`; `application`
  may not import adapters.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before adding a feature. New
OS integration goes behind a port. New product logic goes in the TypeScript
core or a use case, not in a React component or a Tauri command. New user-facing
strings go into both `src/ui/i18n/en.ts` and `es.ts` in the same commit. Data
changes go through the pipeline in [docs/DATA.md](docs/DATA.md); never hand-edit
`data/raw/**` or the SQLite snapshot.

## Test-first workflow

1. Write or update the failing test that describes the behaviour (RED).
2. Implement the smallest change that makes it pass (GREEN).
3. Refactor with the suite green. Never weaken, skip or delete a test to get a
   green build; if a required check cannot run locally, record the exact reason.
4. Add a property test when a data invariant is involved (fast-check, proptest
   or Hypothesis) and an axe scan when a new route or dialog is introduced.

## Commit convention

Use Conventional Commits in English:

```
feat(explore): add a year-range preset control
fix(export): reject paths without a file name
test(core): cover duplicate years in makeSeries
docs: document the lakehouse manifest
ci: add the native e2e job
chore: bump the playwright lockfile
```

Keep commits focused and reviewable (about 400 changed lines or fewer). Do not
add `Co-Authored-By` or AI-attribution trailers. Do not rewrite published
history.

## Pull request checklist

- [ ] The change is described in one paragraph and linked to an ADR/spec when it
      changes a contract.
- [ ] Tests were written first and still pass: `npm run verify` (or the focused
      commands plus a note explaining why a CI-only gate cannot run locally).
- [ ] `npm run lint`, `npm run typecheck` and the coverage thresholds are green.
- [ ] New UI strings exist in English and Spanish; axe scans cover new routes
      and dialogs in both themes.
- [ ] No secrets, personal data, absolute home paths or large generated files
      are added to git.
- [ ] `data/MANIFEST.json`, the snapshot and the fixtures agree with the
      pipeline output when data changes.
- [ ] `CHANGELOG.md` needs no manual edit: it is generated from commits at
      release time.

## Reporting bugs and security issues

Use the GitHub issue templates for functional bugs and feature requests. Report
security issues privately through GitHub Security Advisories as described in
[SECURITY.md](SECURITY.md); do not open a public issue for an unfixed
vulnerability.
