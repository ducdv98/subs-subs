import { SECONDARY_LANGUAGES } from "../lib/languages.js";

// The captions API (player.getOption) is attached by YouTube's own page
// script directly onto the player element instance, so it's only visible
// from the page's main JS world — this content script runs in an isolated
// world that shares the DOM but not those instance methods. content/player-bridge.js
// runs in the main world and republishes captions state onto a DOM attribute,
// which *is* readable cross-world since it's plain DOM, not a JS object.
const BRIDGE_STATE_ATTR = "data-dual-subs-player-state";
const SET_ACTIVE_TRACK_EVENT = "dual-subs-set-active-track";

function readBridgeState() {
  const raw = document.documentElement.getAttribute(BRIDGE_STATE_ATTR);
  const empty = { ready: false, trackCount: 0, activeLanguageCode: null };
  if (!raw) return empty;
  try {
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

export function getPlayer() {
  return document.getElementById("movie_player");
}

export function getTrackList() {
  const state = readBridgeState();
  return state.ready ? Array.from({ length: state.trackCount }) : [];
}

export function getActiveTrack() {
  const state = readBridgeState();
  return state.ready && state.activeLanguageCode
    ? { languageCode: state.activeLanguageCode }
    : null;
}

export function isCaptionsOn(player) {
  const track = getActiveTrack(player);
  return Boolean(track && track.languageCode);
}

export function enableCaptions() {
  const button = document.querySelector(".ytp-subtitles-button");
  if (button && button.getAttribute("aria-pressed") !== "true") {
    button.click();
  }
}

// Tells content/player-bridge.js (MAIN world) to switch the player's active
// caption track back to languageCode via player.setOption — used to restore
// the Primary Track after driving the CC menu to capture a translated one.
export function requestActiveTrackSwitch(languageCode) {
  document.dispatchEvent(
    new CustomEvent(SET_ACTIVE_TRACK_EVENT, { detail: { languageCode } }),
  );
}

function findMenuItemByText(root, text) {
  const items = root.querySelectorAll(".ytp-menuitem, .ytp-panel-menu .ytp-menuitem-label");
  for (const item of items) {
    if (item.textContent?.trim() === text) {
      return item.closest(".ytp-menuitem") ?? item;
    }
  }
  return null;
}

// Drives YouTube's native CC gear menu (the same UI path a human uses) so
// YouTube's own player issues the timedtext?tlang= request — see
// docs/research/pototoken-timedtext.md for why we don't fetch it ourselves.
// Selectors verified against live youtube.com on 2026-07-16; undocumented
// internals, may break on a YouTube UI change.
export async function selectAutoTranslateLanguage(languageCode) {
  const player = getPlayer();
  if (!player) return false;

  const language = SECONDARY_LANGUAGES.find((lang) => lang.code === languageCode);
  if (!language) return false;

  const settingsButton = player.querySelector(".ytp-settings-button");
  if (!settingsButton) return false;
  settingsButton.click();

  const settingsMenu = await waitFor(() => player.querySelector(".ytp-settings-menu"));
  if (!settingsMenu) return false;

  const subtitlesItem = await waitFor(() => findMenuItemByText(settingsMenu, "Subtitles/CC"));
  if (!subtitlesItem) return false;
  subtitlesItem.click();

  const autoTranslateItem = await waitFor(() => findMenuItemByText(settingsMenu, "Auto-translate"));
  if (!autoTranslateItem) return false;
  autoTranslateItem.click();

  const languageItem = await waitFor(() => findMenuItemByText(settingsMenu, language.name));
  if (!languageItem) {
    settingsButton.click();
    return false;
  }
  languageItem.click();

  return true;
}

export function waitFor(predicate, { intervalMs = 200, timeoutMs = 10000, onTick } = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    let attempt = 0;
    const tick = () => {
      attempt += 1;
      const value = predicate();
      onTick?.(attempt, value);
      if (value) {
        resolve(value);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}
