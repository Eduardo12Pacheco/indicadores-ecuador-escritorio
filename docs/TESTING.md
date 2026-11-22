# Testing guide

This guide describes the test layers, the exact commands and the determinism
rules used by the repository. It is the human-readable companion to the CI
workflow.

## Pyramid

| Layer | Runner | Location | What it proves |
|---|---|---|---|
| Pure TypeScript unit and property tests | Vitest 5 + fast-check | `src/core/**/*.test.ts` | transforms, statistics, CSV, search, view state, use cases |
| Component and provider tests | Vitest + Testing Library | `src/ui/**/*.test.tsx` | keyboard behavior, validation, empty/error/loading states, axe (jsdom) |
| Script tests | Vitest | `scripts/__tests__` | version sync, bundle budget, artifact collection |
| Rust unit, integration and property tests | `cargo test` + proptest | `crates/indicators-core`, `src-tauri` | snapshot contracts, user store, update feed, IPC commands |
| Python unit and integration tests | pytest + Hypothesis | `pipeline/tests` | catalog, World Bank adapter, snapshot build/verify, lakehouse import |
| Browser end-to-end and accessibility | Playwright 1.65 (Chromium + WebKit) | `e2e/` | real routing, persistence, downloads, keyboard flows and axe WCAG scans |
| Native end-to-end | WebdriverIO + tauri-driver | `e2e-native/` | the real desktop window on Linux |
| Data reproducibility | `ecuador-data verify` | `data/` | raw checksums, schema counts and the logical hash |

## Commands

```bash
# Fast TypeScript loop
npm run test
npm run test:cov          # enforces the coverage thresholds
npm run typecheck
npm run lint

# Everything the CI gate runs locally
npm run verify

# Measured values used by the README Quality table
npm run metrics

# Browser end-to-end (builds the e2e bundle and starts Vite preview)
npx playwright install chromium webkit
npm run test:e2e
npx playwright test --project=chromium
npx playwright test --project=webkit
npx playwright test e2e/offline.spec.ts --project=chromium

# Rust
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
cargo fmt --all --check

# Python
cd pipeline
uv sync --frozen
uv run pytest -q
uv run ruff check . && uv run ruff format --check .
uv run mypy --strict src
```

`npm run test:e2e` uses `playwright.config.ts`: it runs `npm run build:e2e`
(mini JSON snapshot through the in-memory adapter) and then serves `dist/` on
port 18173. `e2e/media/**` belongs to the capture project and is ignored by the
default run.

## What the E2E suite covers

- `explore.spec.ts`: default GDP, KPI cards, YoY transform and URL state,
  peers, range presets and the data-table alternative.
- `compare.spec.ts`: trajectory base year, the four-indicator cap, ranking
  order, Ecuador highlight, missing geographies last and tab routing.
- `palette.spec.ts`: `Mod+K`, Spanish diacritic-insensitive search, Enter,
  Escape focus restoration, empty results and geography actions.
- `views.spec.ts`: save through `Mod+S`, reload persistence, reopen restoring
  the exact URL state, rename and delete confirmation.
- `export.spec.ts`: exact CSV header, row count and values; PNG signature.
- `settings.spec.ts`: immediate theme/language application and persistence,
  update switch off by default, no update request on launch, dataset counts.
- `states.spec.ts`: empty state, retry after an injected fault, and the
  dataset-problem screen with recovery.
- `keyboard.spec.ts`: skip link, palette, catalog arrows, chart scrubbing,
  save dialog and shortcuts dialog without a mouse.
- `offline.spec.ts`: Explore → Compare → Save → Export with a network guard
  that aborts non-localhost requests and asserts zero attempts (S1).
- `layout.spec.ts`: 960×640 minimum window, collapsed sidebar, no horizontal
  scroll and no clipped primary actions.
- `a11y.spec.ts`: axe with `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa` over
  every route × theme × language (28 scans) plus the palette, save, shortcuts
  and delete dialogs (32 tests total).

The suite never uses sleeps (`waitForTimeout` is forbidden); it relies on
web-first assertions and user-visible state.

## Determinism rules

- No test performs a real network request. The World Bank adapter uses
  `respx` fixtures; the GitHub release feed uses `httpmock` and a recorded
  JSON fixture; browser tests use the bundled mini snapshot.
- The in-memory adapter reads one JSON file per browser context. Tests seed
  `localStorage` before the first paint and never share state between tests.
- Property tests use fixed seeds: fast-check seed in `vitest.config.ts`,
  Hypothesis `derandomize` in CI and `PROPTEST_RNG_SEED` for Rust.
- Rust, Python and the user store integration tests use real SQLite files in
  temporary directories.
- Screenshots and traces are only written on failure (`test-results/`), and the
  capture project in `e2e/media/` is documentation, not assertions.

## Local environment notes

Playwright's WebKit download needs the Ubuntu packages `libicu74` and
`libxml2`; CI installs them with `npx playwright install --with-deps`. On a
workstation without sudo, extract those two runtime packages into the
Playwright browser cache and run with
`PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`; this is a local-only workaround,
not a repository requirement. Native E2E is Linux-only by design (ADR 0007).

## Coverage and gates

| Gate | Threshold | Where |
|---|---|---|
| Vitest lines/statements/functions | 85 % | `vitest.config.ts`, `npm run test:cov` |
| Vitest branches | 80 % | `vitest.config.ts` |
| `src/core/**` | 95 % lines/statements/functions, 90 % branches | `vitest.config.ts` |
| Rust `indicators-core` lines | 85 % | CI via `cargo llvm-cov` |
| Python `pipeline/src` | 85 % | pytest addopts |

Numbers measured on v0.1.0 (2026-11-20):

| Artifact | Value | Produced by |
|---|---|---|
| TypeScript lines / branches / statements / functions | 91.7% / 83.87% / 91.67% / 91.56% | `npm run test:cov` → `coverage/coverage-summary.json` |
| Python pipeline coverage | 96.1% | `uv run pytest` → `pipeline/coverage.json` |
| Browser E2E scenarios | 68 per browser project; 68 passed on Chromium locally, the WebKit project runs in CI | `npm run test:e2e` → `.generated/playwright.json` (`npm run metrics` → `playwright.scenarios`) |
| Rust `indicators-core` lines | 88.9% measured in CI run 44749667530 (gate 85%) | `cargo llvm-cov -p indicators-core --fail-under-lines 85` |
| JavaScript gzip total | 392,397 B (budget 716,800 B) | `npm run build` + `node scripts/check-bundle-size.mjs` |
| Snapshot | 38 indicators, 8 topics, 7 geographies, 11,780 observations | `data/MANIFEST.json` |

`npm run metrics` prints the same values as JSON, except the Rust number. That
number is not measured locally: the `rust-coverage` CI job runs `cargo llvm-cov`,
enforces the 85% gate, and prints the lines percentage (88.91% in run
44749667530, the value shown above).

## CI job map

| CI job | Local equivalent |
|---|---|
| `lint` | `npm run lint`, `npm run typecheck`, `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `uv run ruff check`, `uv run ruff format --check`, `uv run mypy --strict src`, `uv run lint-imports`, `uv lock --check` |
| `ts` (3 OS) | `npm run test:cov` |
| `rust` (3 OS) | `cargo test --workspace` |
| `rust-coverage` | `cargo llvm-cov -p indicators-core --fail-under-lines 85` (CI only) |
| `pipeline` (3 OS) | `cd pipeline && uv run pytest` |
| `data` | `uv run ecuador-data verify` plus deterministic rebuild and fixture comparisons |
| `bindings` | `npm run check:bindings` |
| `e2e-web` | `npx playwright install --with-deps chromium webkit && npm run test:e2e` |
| `e2e-native` | `xvfb-run -a npm --prefix e2e-native test` after `npx tauri build --no-bundle` |
| `audit`, `secrets`, `licenses` | `npm audit --omit=dev --audit-level=high`, `cargo audit`, `cargo deny check`, `uv run pip-audit`, `gitleaks git`, `npm run check:licenses` |
| `build-smoke`, `version` | `npm run build`, `npx tauri build --no-bundle`, `--self-check`, `npm run check:version` |

## Native E2E

The WebdriverIO suite in `e2e-native/` drives the real window through
`tauri-driver` + WebKitWebDriver on Linux. It needs `tauri-driver`,
`WebKitWebDriver` and a display: `node scripts/native-e2e-prereqs.mjs` reports
every missing item and exits 3. CI installs the packages and runs the suite
under `xvfb-run`; the same command is `npm run e2e:native`. macOS is excluded
because `tauri-driver` has no WKWebView driver (ADR 0007).

## Known gaps

- Rust line coverage, `cargo deny`/`cargo audit` on runners, the 3-OS matrices
  and native E2E execute only in GitHub Actions; the local host cannot run them
  (no rustup/llvm-tools, no WebKitWebDriver) and reports the reason instead of
  inventing a result.
- Playwright WebKit on a workstation without `libicu74`/`libxml2` needs
  `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` after extracting those packages
  into the browser cache. CI installs them with `--with-deps`.
- Installer sizes are reported only from real release artifacts; no release has
  been published at v0.1.0.
- Visual regression is intentionally out of scope; screenshots are documentation
  generated by `npm run capture:media`, not assertions.
