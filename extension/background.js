import { parseSettings, toggleDualSubMode } from "./lib/settings.js";

chrome.action.onClicked.addListener(async () => {
  const raw = await chrome.storage.local.get(["dualSubMode", "secondaryLanguage"]);
  const settings = parseSettings(raw);

  await chrome.storage.local.set({
    dualSubMode: toggleDualSubMode(settings.dualSubMode),
  });
});
