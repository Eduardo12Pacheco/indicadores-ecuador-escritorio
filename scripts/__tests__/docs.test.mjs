import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const README_ES = join(ROOT, "README.md");
const README_EN = join(ROOT, "README.en.md");
const ARCHITECTURE = join(ROOT, "docs", "ARCHITECTURE.md");

const ADR_SECTIONS = ["## Estado", "## Contexto", "## Decisión", "## Consecuencias"];
const MARKDOWN_LINK = /!?\[[^\]]*\]\(([^)]+)\)/g;
const EXTERNAL_SCHEME = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

function read(path) {
  return readFileSync(path, "utf8");
}

function stripCodeFences(text) {
  return text.replace(/^```[\s\S]*?^```/gm, "");
}

function docsFiles() {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(path);
      }
    }
  };
  walk(join(ROOT, "docs"));
  return files;
}

function relativeLinks(path) {
  const text = stripCodeFences(read(path));
  const links = [];
  for (const match of text.matchAll(MARKDOWN_LINK)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1).trim();
    }
    if (EXTERNAL_SCHEME.test(target) || target.startsWith("#")) {
      continue;
    }
    links.push({ target, line: text.slice(0, match.index).split("\n").length });
  }
  return links;
}

function adrFiles() {
  return readdirSync(join(ROOT, "docs", "adr"))
    .filter((name) => /^000[1-9]-.*\.md$/.test(name))
    .sort();
}

describe("documentation", () => {
  it("keeps both READMEs within the 150-line cap", () => {
    for (const readme of [README_ES, README_EN]) {
      expect(existsSync(readme), relative(ROOT, readme)).toBe(true);
      const text = read(readme);
      const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
      expect(lines, relative(ROOT, readme)).toBeLessThanOrEqual(150);
    }
  });

  it("ships the Spanish README with the same section count as the English one", () => {
    expect(existsSync(README_ES)).toBe(true);
    expect(existsSync(README_EN)).toBe(true);
    const headings = (path) => read(path).match(/^## /gm)?.length ?? 0;
    expect(headings(README_ES)).toBe(headings(README_EN));
    expect(headings(README_EN)).toBeGreaterThan(0);
  });

  it("keeps every relative link and image in the READMEs and docs resolvable", () => {
    const files = [README_ES, README_EN, ...docsFiles()];
    const broken = [];
    for (const file of files) {
      for (const { target, line } of relativeLinks(file)) {
        const withoutFragment = target.split("#")[0].split("?")[0];
        if (!withoutFragment) {
          continue;
        }
        const decoded = decodeURIComponent(withoutFragment);
        const resolved = resolve(dirname(file), decoded);
        if (!existsSync(resolved) || !statSync(resolved).isFile()) {
          broken.push(
            `${relative(ROOT, file)}:${line} -> ${target} (resolved ${relative(ROOT, resolved)})`,
          );
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("has no unfinished markers in the documentation", () => {
    const files = [
      README_ES,
      README_EN,
      join(ROOT, "CONTRIBUTING.md"),
      join(ROOT, "SECURITY.md"),
      ...docsFiles(),
    ];
    // Uppercase whole-word markers: a case-insensitive substring match would
    // flag the Spanish word "todo" (and "todos") as an unfinished marker.
    const markers = [/\b(?:TODO|TBD|FIXME)\b/, /\blorem\b/i];
    const unfinished = files
      .filter((file) => existsSync(file))
      .filter((file) => markers.some((marker) => marker.test(stripCodeFences(read(file)))))
      .map((file) => relative(ROOT, file));
    expect(unfinished).toEqual([]);
  });

  it("has nine complete ADRs", () => {
    const files = adrFiles();
    expect(files).toHaveLength(9);
    for (const name of files) {
      const text = read(join(ROOT, "docs", "adr", name));
      for (const section of ADR_SECTIONS) {
        expect(text, `${name} is missing ${section}`).toContain(section);
      }
    }
  });

  it("renders mermaid diagrams in both READMEs and the architecture guide", () => {
    expect(existsSync(ARCHITECTURE)).toBe(true);
    expect(read(README_ES)).toContain("```mermaid");
    expect(read(README_EN)).toContain("```mermaid");
    expect(read(ARCHITECTURE)).toContain("```mermaid");
  });
});
