#!/usr/bin/env node

/**
 * Prints the measured quality numbers used by the README Quality table as JSON.
 *
 * Every value comes from an artifact produced by a committed command:
 *   - coverage/coverage-summary.json        (npm run test:cov)
 *   - pipeline/coverage.json                (uv run pytest)
 *   - .generated/playwright.json            (npm run test:e2e)
 *   - dist/assets/**\/*.js                  (npm run build)
 *   - data/MANIFEST.json                    (committed snapshot manifest)
 *
 * The Rust >= 85% line gate is a CI threshold (D23), not a local measurement,
 * so it is printed as the declared gate value.
 *
 * Usage: npm run metrics
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { collectBundleSizes } from "./check-bundle-size.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(path, label) {
  if (!existsSync(path)) {
    throw new Error(
      `${label} not found at ${path}; run the command that produces it before npm run metrics`,
    );
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

/** Walks the Playwright JSON report and returns its distinct scenarios and project names. */
export function summarizePlaywright(report) {
  const scenarios = new Set();
  const projects = new Set();
  const visit = (suites) => {
    for (const suite of suites ?? []) {
      for (const spec of suite.specs ?? []) {
        scenarios.add(`${spec.file}::${spec.title}`);
        for (const test of spec.tests ?? []) {
          if (test.projectName) {
            projects.add(test.projectName);
          }
        }
      }
      visit(suite.suites);
    }
  };
  visit(report.suites);
  return { scenarios: scenarios.size, projects: [...projects].sort() };
}

/** Collects every measured value from the repository artifacts. */
export function collectMetrics({ root = defaultRoot } = {}) {
  const coverage = readJson(join(root, "coverage", "coverage-summary.json"), "TypeScript coverage");
  const python = readJson(join(root, "pipeline", "coverage.json"), "Python coverage");
  const playwright = readJson(join(root, ".generated", "playwright.json"), "Playwright report");
  const manifest = readJson(join(root, "data", "MANIFEST.json"), "snapshot manifest");

  const total = coverage.total ?? {};
  const stats = playwright.stats ?? {};
  const playwrightTests =
    Number(stats.expected ?? 0) +
    Number(stats.unexpected ?? 0) +
    Number(stats.flaky ?? 0) +
    Number(stats.skipped ?? 0);

  if (playwrightTests === 0) {
    throw new Error("the Playwright report contains no tests; run npm run test:e2e");
  }

  const bundle = collectBundleSizes(join(root, "dist"));
  if (bundle.length === 0) {
    throw new Error("no JavaScript assets in dist; run npm run build");
  }
  const gzipBytes = bundle.reduce((sum, asset) => sum + asset.gzipBytes, 0);

  const counts = manifest.snapshot?.counts ?? {};
  const pythonPercent = python.totals?.percent_covered;
  if (typeof pythonPercent !== "number") {
    throw new Error("pipeline/coverage.json has no totals.percent_covered");
  }

  return {
    typescript: {
      statements: round(total.statements?.pct),
      branches: round(total.branches?.pct),
      functions: round(total.functions?.pct),
      lines: round(total.lines?.pct),
    },
    python: { percent: round(pythonPercent) },
    playwright: { tests: playwrightTests, ...summarizePlaywright(playwright) },
    bundle: { gzipBytes, gzipKiB: round(gzipBytes / 1024) },
    snapshot: {
      topics: Number(counts.topics ?? 0),
      geographies: Number(counts.geographies ?? 0),
      indicators: Number(counts.indicators ?? 0),
      observations: Number(counts.observations ?? 0),
    },
    gates: { rustCoreLineCoverageGatePercent: 85 },
  };
}

function main() {
  try {
    process.stdout.write(`${JSON.stringify(collectMetrics(), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`metrics: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
