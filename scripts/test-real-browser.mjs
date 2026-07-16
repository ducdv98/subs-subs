// Loads unpacked extension in real Chrome via Playwright, opens a YouTube video,
// enables Dual-Sub Mode, and reports whether secondary captions actually render.
//
// Usage: node scripts/test-real-browser.mjs <videoId> [secondaryLanguage]
// Example: node scripts/test-real-browser.mjs UF8uR6Z6KLc vi

import { chromium } from "playwright";
import path from "node:path";

const VIDEO = process.argv[2];
const SECONDARY_LANGUAGE = process.argv[3] ?? "vi";

if (!VIDEO) {
  console.error("usage: node scripts/test-real-browser.mjs <videoId> [secondaryLanguage]");
  process.exit(1);
}

const extPath = path.resolve(new URL("../extension", import.meta.url).pathname);
const userDataDir = path.resolve(new URL("../.tmp-chrome-profile", import.meta.url).pathname);

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
});

await new Promise((r) => setTimeout(r, 1500));
let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent("serviceworker", { timeout: 10000 });
const extId = sw.url().split("/")[2];
console.log("extension id", extId);

const page = await context.newPage();
page.on("console", (msg) => {
  const t = msg.text();
  if (t.includes("DualSubs")) console.log("[PAGE]", t);
});
page.on("pageerror", (err) => console.log("[PAGEERROR]", err.message));

const settingsPage = await context.newPage();
await settingsPage.goto(`chrome-extension://${extId}/options.html`);
await settingsPage.evaluate(
  async (secondaryLanguage) => {
    await chrome.storage.local.set({ dualSubMode: true, secondaryLanguage });
  },
  SECONDARY_LANGUAGE,
);
await settingsPage.close();

await page.goto(`https://www.youtube.com/watch?v=${VIDEO}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(20000);

const info = await page.evaluate(() => {
  const el = document.getElementById("dual-subs-secondary-line");
  return {
    secondaryLineExists: !!el,
    secondaryLineText: el?.textContent,
    secondaryLineVisibility: el?.style.visibility,
    bridgeState: document.documentElement.getAttribute("data-dual-subs-player-state"),
  };
});
console.log("RESULT", JSON.stringify(info, null, 2));

await context.close();
