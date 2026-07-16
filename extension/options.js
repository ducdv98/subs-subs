import { parseSettings } from "./lib/settings.js";

const statusEl = document.getElementById("dualSubModeStatus");
const input = document.getElementById("secondaryLanguage");

chrome.storage.local.get(["dualSubMode", "secondaryLanguage"]).then((raw) => {
  const settings = parseSettings(raw);
  statusEl.textContent = settings.dualSubMode ? "on" : "off";
  input.value = settings.secondaryLanguage;
});

input.addEventListener("change", () => {
  chrome.storage.local.set({ secondaryLanguage: input.value });
});
