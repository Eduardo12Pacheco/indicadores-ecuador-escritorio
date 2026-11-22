/**
 * Hexagonal dependency rules for the TypeScript runtime (S23).
 *
 * The graph is built with a deliberately small regex parser: it only needs to
 * understand this repository's import style, and keeping it dependency-free
 * means the rule cannot silently drift with a tool upgrade.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** Forward-slash form of a path, so Windows (`\`) and POSIX (`/`) paths compare equal. */
function toPosix(path: string): string {
  return path.replace(/\\/g, "/");
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = toPosix(join(ROOT, "src"));

interface ImportEdge {
  readonly file: string;
  readonly specifier: string;
  readonly target: string;
}

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) {
      files.push(...walk(absolute));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      files.push(absolute);
    }
  }
  return files;
}

function importSpecifiers(source: string): string[] {
  const specifiers = new Set<string>();
  const lines = source.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = (lines[index] ?? "").trim();
    if (
      !trimmed.startsWith("import ") &&
      !trimmed.startsWith("import{") &&
      !trimmed.startsWith("export ") &&
      !trimmed.startsWith("export{")
    ) {
      continue;
    }
    let statement = trimmed;
    let cursor = index;
    while (
      !/from\s*["']/.test(statement) &&
      !/^import\s*["']/.test(statement) &&
      cursor < index + 20
    ) {
      cursor += 1;
      const next = lines[cursor];
      if (next === undefined) {
        break;
      }
      statement += ` ${next.trim()}`;
    }
    const fromMatch = statement.match(/\bfrom\s*["']([^"']+)["']/);
    if (fromMatch?.[1] !== undefined) {
      specifiers.add(fromMatch[1]);
      index = cursor;
      continue;
    }
    const bareMatch = statement.match(/^import\s*["']([^"']+)["']/);
    if (bareMatch?.[1] !== undefined) {
      specifiers.add(bareMatch[1]);
      index = cursor;
    }
  }
  for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    if (match[1] !== undefined) {
      specifiers.add(match[1]);
    }
  }
  return [...specifiers];
}

function relativeToSrc(absolute: string): string {
  return toPosix(relative(SRC, absolute));
}

function resolveSpecifier(file: string, specifier: string): string {
  if (!specifier.startsWith(".")) {
    return specifier;
  }
  const resolved = toPosix(normalize(resolve(dirname(file), specifier)));
  if (resolved.startsWith(`${SRC}/`)) {
    return relativeToSrc(resolved);
  }
  return resolved;
}

function category(target: string): string {
  if (target.startsWith("core/domain/") || target === "core/domain") {
    return "core.domain";
  }
  if (target.startsWith("core/application/") || target === "core/application") {
    return "core.application";
  }
  if (target.startsWith("core/contracts/") || target === "core/contracts") {
    return "core.contracts";
  }
  if (target.startsWith("adapters/tauri/generated/")) {
    return "generated";
  }
  if (target.startsWith("adapters/")) {
    return "adapters";
  }
  if (target.startsWith("ui/")) {
    return "ui";
  }
  if (target.startsWith("app/")) {
    return "app";
  }
  if (target.startsWith("test/")) {
    return "test";
  }
  if (target.startsWith("react") || target.startsWith("@tauri-apps/")) {
    return "framework";
  }
  if (target === "zod" || target.startsWith("zod/")) {
    return "zod";
  }
  if (target === "echarts" || target.startsWith("echarts/")) {
    return "echarts";
  }
  if (target.endsWith(".json")) {
    return "fixture";
  }
  return "external";
}

function buildGraph(): ImportEdge[] {
  const edges: ImportEdge[] = [];
  for (const file of walk(SRC)) {
    const source = readFileSync(file, "utf8");
    for (const specifier of importSpecifiers(source)) {
      edges.push({
        file: relativeToSrc(file),
        specifier,
        target: resolveSpecifier(file, specifier),
      });
    }
  }
  return edges;
}

const EDGES = buildGraph();

function violations(owner: string, allowed: readonly string[]): string[] {
  return EDGES.filter((edge) => {
    const source = category(edge.file);
    if (source !== owner) {
      return false;
    }
    const destination = category(edge.target);
    return !allowed.includes(destination);
  }).map((edge) => `${edge.file} -> ${edge.specifier}`);
}

describe("path normalization", () => {
  it("turns backslash separators into forward slashes", () => {
    expect(toPosix("core\\domain\\result.ts")).toBe("core/domain/result.ts");
    expect(toPosix("core/domain/result.ts")).toBe("core/domain/result.ts");
  });
});

describe("TypeScript dependency rules", () => {
  it("finds the source modules", () => {
    expect(EDGES.length).toBeGreaterThan(0);
  });

  it("keeps core/domain self-contained", () => {
    expect(violations("core.domain", ["core.domain"])).toEqual([]);
  });

  it("lets core/application use only domain and itself", () => {
    expect(violations("core.application", ["core.domain", "core.application"])).toEqual([]);
  });

  it("lets core/contracts use domain, zod and generated wire types", () => {
    expect(violations("core.contracts", ["core.domain", "zod", "generated", "fixture"])).toEqual(
      [],
    );
  });

  it("keeps adapters away from UI and app", () => {
    expect(
      violations("adapters", [
        "core.domain",
        "core.application",
        "core.contracts",
        "adapters",
        "generated",
        "framework",
        "zod",
        "external",
        "fixture",
      ]),
    ).toEqual([]);
  });

  it("keeps ui on core, ui and presentation libraries", () => {
    // UI components may use React and presentational npm packages, but never
    // adapters, the app composition root or Tauri APIs (the table's hard rule).
    expect(
      violations("ui", [
        "core.domain",
        "core.application",
        "core.contracts",
        "ui",
        "framework",
        "external",
        "echarts",
      ]),
    ).toEqual([]);
    const tauri = EDGES.filter(
      (edge) => edge.file.startsWith("ui/") && edge.specifier.startsWith("@tauri-apps/"),
    ).map((edge) => `${edge.file} -> ${edge.specifier}`);
    expect(tauri).toEqual([]);
  });

  it("keeps framework imports out of the core", () => {
    const forbidden = EDGES.filter(
      (edge) =>
        edge.file.startsWith("core/") && ["framework", "echarts"].includes(category(edge.target)),
    ).map((edge) => `${edge.file} -> ${edge.specifier}`);
    expect(forbidden).toEqual([]);
  });

  it("keeps zod out of domain and application", () => {
    const forbidden = EDGES.filter(
      (edge) =>
        (edge.file.startsWith("core/domain/") || edge.file.startsWith("core/application/")) &&
        category(edge.target) === "zod",
    ).map((edge) => `${edge.file} -> ${edge.specifier}`);
    expect(forbidden).toEqual([]);
  });

  it("keeps IPC invocation inside the Tauri adapter", () => {
    const offenders = EDGES.filter(
      (edge) =>
        !edge.file.startsWith("adapters/") &&
        (edge.specifier === "@tauri-apps/api/core" ||
          edge.specifier.startsWith("@tauri-apps/plugin-")),
    ).map((edge) => `${edge.file} -> ${edge.specifier}`);
    expect(offenders).toEqual([]);
  });
});
