import { parseSettings } from "./lib/settings.js";
import { isWatchUrl } from "./lib/tabs.js";

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

async function syncActionState(tabId, url) {
  // host_permissions only covers youtube.com, so url is undefined (redacted
  // by Chrome) on other-origin tabs — isWatchUrl(undefined) is false, which
  // correctly disables the icon there too.
  if (isWatchUrl(url)) {
    await chrome.action.enable(tabId);
  } else {
    await chrome.action.disable(tabId);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url === undefined && changeInfo.status !== "complete") return;
  syncActionState(tabId, tab.url).catch(() => {});
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab) return;
  syncActionState(tabId, tab.url).catch(() => {});
});

async function syncAllTabsActionState() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map((tab) => syncActionState(tab.id, tab.url).catch(() => {})),
  );
}

chrome.runtime.onStartup.addListener(syncBadge);
chrome.runtime.onInstalled.addListener(syncBadge);
chrome.runtime.onStartup.addListener(syncAllTabsActionState);
chrome.runtime.onInstalled.addListener(syncAllTabsActionState);
syncBadge();
syncAllTabsActionState();
