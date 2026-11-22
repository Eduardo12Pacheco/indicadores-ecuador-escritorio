import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** WCAG tags required by S11 (2.0 and 2.1, levels A and AA). */
export const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const;

/** One compact, readable axe violation. */
interface ViolationSummary {
  readonly id: string;
  readonly impact: string | null | undefined;
  readonly help: string;
  readonly nodes: string[];
  /** axe's per-node reasons, such as the measured foreground and background colors. */
  readonly reasons: string[];
}

/**
 * Runs axe over the whole document and fails on any violation.
 *
 * There are no exclusions in this suite: every page, theme and language must be
 * clean without rule disables, because a justified exclusion would still hide
 * a user-facing barrier from the gate.
 */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags([...A11Y_TAGS]).analyze();
  const summary: ViolationSummary[] = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(" ")),
    reasons: violation.nodes.flatMap((node) =>
      [...node.any, ...node.all, ...node.none].map((check) => check.message),
    ),
  }));
  expect(
    summary,
    `axe found accessibility violations:\n${JSON.stringify(summary, null, 2)}`,
  ).toEqual([]);
}
