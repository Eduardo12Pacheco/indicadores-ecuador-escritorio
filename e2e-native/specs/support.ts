import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path of the repository root. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Release binary produced by `npx tauri build --no-bundle`. */
export const appBinary = resolve(
  repoRoot,
  "target/release",
  process.platform === "win32" ? "ecuador-indicators.exe" : "ecuador-indicators",
);

/** Directory for screenshots and other native artifacts. */
export const artifactsDir = resolve(repoRoot, "e2e-native/artifacts");

/** Creates the artifacts directory once per spec. */
export function ensureArtifacts(): void {
  mkdirSync(artifactsDir, { recursive: true });
}

/** Waits for the real window and the first catalog render. */
export async function waitForApp(): Promise<void> {
  await browser.waitUntil(async () => (await browser.getTitle()) === "Ecuador Indicators", {
    timeout: 30_000,
    timeoutMsg: "the native window did not report the product title",
  });
  // The listbox is the unique test id that appears with the first catalog render.
  // The option test id matches every indicator (38), which WebdriverIO strict mode rejects.
  await $('[data-testid="catalog-listbox"]').waitForDisplayed({ timeout: 20_000 });
}

/** Sends a shortcut with the platform modifier the app expects. */
export async function pressMod(key: string): Promise<void> {
  await browser.keys([process.platform === "darwin" ? "Meta" : "Control", key]);
}

/** Changes the hash route inside the real webview. */
export async function navigateTo(hash: string): Promise<void> {
  await browser.execute((target: string) => {
    window.location.hash = target;
  }, hash);
}

/** Reads an attribute from the document element. */
export async function documentAttribute(name: string): Promise<string | null> {
  return browser.execute((attribute: string) => document.documentElement.getAttribute(attribute), name);
}
