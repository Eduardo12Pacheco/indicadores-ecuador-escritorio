import { waitForApp } from "./support";

describe("native language switch", () => {
  // One run shares a single app home, so the language would leak into the specs that follow.
  after(async () => {
    await $('[data-testid="language-switch"]').selectByAttribute("value", "en");
  });

  it("switches the navigation to Spanish", async () => {
    await waitForApp();

    // The page has three <select> elements; the language switch has a unique test id.
    await $('[data-testid="language-switch"]').selectByVisibleText("Español");
    await browser.waitUntil(async () => (await $("html").getAttribute("lang")) === "es", {
      timeout: 10_000,
      timeoutMsg: "the document language did not change",
    });

    expect(await $('[data-testid="nav-explore"]').getAttribute("aria-label")).toBe("Explorar");
    expect(await $('[data-testid="nav-views"]').getAttribute("aria-label")).toBe("Vistas guardadas");
  });
});
