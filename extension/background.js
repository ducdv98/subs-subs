import { parseSettings } from "./lib/settings.js";

const BADGE_ON_TEXT = "ON";
const BADGE_ON_COLOR = "#2e7d32";
const BADGE_OFF_COLOR = "#000000";

function renderBadge(dualSubMode) {
  chrome.action.setBadgeText({ text: dualSubMode ? BADGE_ON_TEXT : "" });
  chrome.action.setBadgeBackgroundColor({
    color: dualSubMode ? BADGE_ON_COLOR : BADGE_OFF_COLOR,
  });
}

async function readSettings() {
  const raw = await chrome.storage.local.get(["dualSubMode", "secondaryLanguage"]);
  return parseSettings(raw);
}

async function syncBadge() {
  renderBadge((await readSettings()).dualSubMode);
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if ("dualSubMode" in changes) {
    renderBadge(parseSettings({ dualSubMode: changes.dualSubMode.newValue }).dualSubMode);
  }
});

chrome.runtime.onStartup.addListener(syncBadge);
chrome.runtime.onInstalled.addListener(syncBadge);
syncBadge();
