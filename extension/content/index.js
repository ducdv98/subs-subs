(async () => {
  const { parseSettings, STYLE_SETTING_KEYS } = await import(
    chrome.runtime.getURL("lib/settings.js")
  );
  const { computeRenderDecision, derivePrimaryTrackChange } = await import(
    chrome.runtime.getURL("lib/subtitle-engine.js")
  );
  const {
    getPlayer,
    getTrackList,
    getActiveTrack,
    enableCaptions,
    selectAutoTranslateLanguage,
    requestActiveTrackSwitch,
    waitFor,
  } = await import(chrome.runtime.getURL("content/player.js"));
  const { parseVtt, parseJson3 } = await import(chrome.runtime.getURL("content/vtt.js"));
  const { isKnownSecondaryLanguage } = await import(
    chrome.runtime.getURL("lib/languages.js")
  );

  const LOG_PREFIX = "[DualSubs]";
  const SECONDARY_LINE_ID = "dual-subs-secondary-line";
  let activeSession = null;

  function removeSecondaryLine() {
    document.getElementById(SECONDARY_LINE_ID)?.remove();
  }

  function hexToRgba(hex, opacityPercent) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacityPercent / 100})`;
  }

  function applySecondaryLineStyle(el, settings) {
    el.style.color = hexToRgba(settings.secondaryLineColor, settings.secondaryLineOpacity);
    el.style.fontSize = `${1.5 * settings.secondaryLineSize}vw`;
    el.style.bottom = `${settings.secondaryLinePosition}%`;
  }

  function injectSecondaryLine(player, settings) {
    removeSecondaryLine();
    const el = document.createElement("div");
    el.id = SECONDARY_LINE_ID;
    el.style.cssText =
      "position:absolute;left:0;right:0;text-align:center;" +
      "line-height:1.4;text-shadow:1px 1px 2px rgba(0,0,0,0.8);" +
      "pointer-events:none;z-index:56;";
    applySecondaryLineStyle(el, settings);
    player.appendChild(el);
    return el;
  }

  const VTT_EVENT = "dual-subs-secondary-vtt";
  const PLAYER_STATE_EVENT = "dual-subs-player-state-changed";
  const CAPTURE_TIMEOUT_MS = 8000; // native auto-translate response typically arrives in 1-3s

  function waitForCapturedVtt(tlang, timeoutMs) {
    return new Promise((resolve) => {
      let settled = false;
      const onEvent = (event) => {
        if (event.detail?.tlang !== tlang) return;
        finish(event.detail.vttText ?? "");
      };
      const timer = setTimeout(() => finish(null), timeoutMs);
      function finish(value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        document.removeEventListener(VTT_EVENT, onEvent);
        resolve(value);
      }
      document.addEventListener(VTT_EVENT, onEvent);
    });
  }

  // Doesn't fetch anything itself — YouTube's own `timedtext` fetch is
  // PoToken-gated for our content script (see
  // docs/research/pototoken-timedtext.md). Instead drives the native CC
  // "Auto-translate" menu so YouTube's own player issues (and gets a real
  // response for) that request, captured by content/player-bridge.js in the
  // page's MAIN world, then restores the Primary Track.
  async function fetchSecondaryCues(primaryLanguageCode, secondaryLanguage) {
    console.log(LOG_PREFIX, "capturing secondary cues via native auto-translate", {
      primaryLanguageCode,
      secondaryLanguage,
    });

    const captionWindows = document.querySelectorAll(".caption-window");
    captionWindows.forEach((el) => (el.style.opacity = "0"));

    try {
      const capturePromise = waitForCapturedVtt(secondaryLanguage, CAPTURE_TIMEOUT_MS);
      const menuDriven = await selectAutoTranslateLanguage(secondaryLanguage);
      if (!menuDriven) {
        console.warn(LOG_PREFIX, "could not drive CC auto-translate menu");
        return [];
      }

      const vttText = await capturePromise;
      if (!vttText) {
        console.warn(LOG_PREFIX, "secondary cue capture timed out or returned empty", {
          secondaryLanguage,
        });
        return [];
      }

      // YouTube's native request format varies (json3 is typical for its own
      // player, but a genuine vtt response is handled too if it ever occurs).
      const cues = parseJson3(vttText) ?? parseVtt(vttText);
      console.log(LOG_PREFIX, "parsed secondary cues", { count: cues.length });
      return cues;
    } finally {
      requestActiveTrackSwitch(primaryLanguageCode);
      captionWindows.forEach((el) => (el.style.opacity = ""));
    }
  }

  function stopSession() {
    if (activeSession) {
      activeSession.video.removeEventListener("timeupdate", activeSession.onTimeUpdate);
      document.removeEventListener(PLAYER_STATE_EVENT, activeSession.checkForTrackChange);
      activeSession.cancel();
      activeSession = null;
    }
    removeSecondaryLine();
  }

  async function startSession(settings) {
    console.log(LOG_PREFIX, "startSession", settings);

    const player = await waitFor(getPlayer, {
      timeoutMs: 120000,
      onTick: (attempt) => {
        if (attempt % 25 === 0) {
          console.log(LOG_PREFIX, `still waiting for player… (attempt ${attempt}, ~${Math.round((attempt * 200) / 1000)}s)`);
        }
      },
    });
    if (!player) {
      console.warn(LOG_PREFIX, "no player found after 120s, giving up (long ad or slow load?)");
      return;
    }

    const tracklist = getTrackList(player);
    if (tracklist.length === 0) {
      console.warn(LOG_PREFIX, "no caption tracks available for this video");
      return;
    }

    const secondaryLanguageKnown = isKnownSecondaryLanguage(settings.secondaryLanguage);
    if (!secondaryLanguageKnown) {
      console.error(
        LOG_PREFIX,
        `secondaryLanguage "${settings.secondaryLanguage}" is not a recognized language code — check Options`,
      );
    }

    let primaryLanguageCode = null;
    let secondaryCues = null;
    let fetchingSecondary = false;
    let cancelled = false;

    function currentLiveLanguageCode(fallback) {
      const liveTrack = getActiveTrack(player);
      return liveTrack && liveTrack.languageCode ? liveTrack.languageCode : fallback;
    }

    // Re-checks the live track after each fetch so a track change that
    // happens mid-fetch isn't dropped once fetchingSecondary clears.
    async function settleSecondaryCues(startLanguageCode) {
      if (!secondaryLanguageKnown) {
        primaryLanguageCode = startLanguageCode;
        secondaryCues = [];
        return;
      }

      let languageCode = startLanguageCode;
      for (;;) {
        secondaryCues = null;
        const { fetchRequired } = derivePrimaryTrackChange({
          primaryLanguageCode: languageCode,
          secondaryLanguage: settings.secondaryLanguage,
        });
        const cues = fetchRequired
          ? await fetchSecondaryCues(languageCode, settings.secondaryLanguage)
          : null;
        if (cancelled) return;

        primaryLanguageCode = languageCode;
        secondaryCues = cues;
        console.log(LOG_PREFIX, "settled secondary cues", {
          primaryLanguageCode,
          cueCount: cues ? cues.length : 0,
        });

        const liveLanguageCode = currentLiveLanguageCode(languageCode);
        if (liveLanguageCode === languageCode) return;
        languageCode = liveLanguageCode;
      }
    }

    // Reacts to content/player-bridge.js's player-state-changed event
    // instead of polling on a fixed interval.
    function checkForTrackChange() {
      if (fetchingSecondary || cancelled) return;
      const liveLanguageCode = currentLiveLanguageCode(primaryLanguageCode);
      if (liveLanguageCode === primaryLanguageCode) return;

      fetchingSecondary = true;
      settleSecondaryCues(liveLanguageCode).finally(() => {
        fetchingSecondary = false;
      });
    }

    enableCaptions();
    // player-bridge.js (US-010) starts watching for track changes as soon
    // as the player element exists, not gated on captions being active, so
    // this wait always resolves with whatever track is live by the time
    // captions do become active — a switch during a pre-roll ad is never
    // stale here, even though this listener itself attaches after.
    const activeTrack = await waitFor(
      () => {
        const track = getActiveTrack(player);
        return track && track.languageCode ? track : null;
      },
      { timeoutMs: 30000 },
    );
    if (!activeTrack) {
      console.warn(LOG_PREFIX, "captions never became active after 30s, giving up");
      return;
    }

    const video = player.querySelector("video");
    if (!video) return;

    primaryLanguageCode = activeTrack.languageCode;
    console.log(LOG_PREFIX, "active track", {
      primaryLanguageCode,
      secondaryLanguage: settings.secondaryLanguage,
    });

    await settleSecondaryCues(primaryLanguageCode);

    const secondaryLineEl = injectSecondaryLine(player, settings);

    const onTimeUpdate = () => {
      const decision = computeRenderDecision({
        dualSubModeEnabled: true,
        primaryLanguageCode,
        secondaryLanguage: settings.secondaryLanguage,
        primaryCues: [],
        secondaryCues,
        currentTime: video.currentTime,
      });
      if (!secondaryLanguageKnown) {
        secondaryLineEl.textContent = `(Dual-Sub Mode: unrecognized secondary language "${settings.secondaryLanguage}" — fix in Options)`;
        secondaryLineEl.style.visibility = "visible";
        return;
      }
      if (decision.suppressed) {
        secondaryLineEl.textContent = "(Dual-Sub Mode: secondary track matches primary language)";
        secondaryLineEl.style.visibility = "visible";
        return;
      }
      if (secondaryCues !== null && secondaryCues.length === 0) {
        secondaryLineEl.textContent = "(Dual-Sub Mode: no secondary captions available for this video)";
        secondaryLineEl.style.visibility = "visible";
        return;
      }
      secondaryLineEl.textContent = decision.secondaryText ?? "";
      secondaryLineEl.style.visibility = decision.secondaryText ? "visible" : "hidden";
    };

    document.addEventListener(PLAYER_STATE_EVENT, checkForTrackChange);
    video.addEventListener("timeupdate", onTimeUpdate);
    activeSession = {
      video,
      el: secondaryLineEl,
      onTimeUpdate,
      checkForTrackChange,
      cancel: () => {
        cancelled = true;
      },
    };
  }

  const SETTINGS_KEYS = ["dualSubMode", "secondaryLanguage", ...STYLE_SETTING_KEYS];

  async function init() {
    stopSession();

    const raw = await chrome.storage.local.get(SETTINGS_KEYS);
    const settings = parseSettings(raw);
    console.log(LOG_PREFIX, "init", { raw, settings });
    if (!settings.dualSubMode) {
      console.log(LOG_PREFIX, "dualSubMode is off, not starting");
      return;
    }

    await startSession(settings);
  }

  // Style-only changes restyle the live secondaryLineEl in place — no
  // session teardown, no CC menu re-drive, no cue re-fetch (see
  // docs/decisions/0009-style-settings-bypass-full-restart.md). Only
  // dualSubMode/secondaryLanguage changes go through the full init().
  async function restyleActiveSession() {
    if (!activeSession) return;
    const raw = await chrome.storage.local.get(SETTINGS_KEYS);
    const settings = parseSettings(raw);
    applySecondaryLineStyle(activeSession.el, settings);
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    const changedKeys = Object.keys(changes);
    if (changedKeys.includes("dualSubMode") || changedKeys.includes("secondaryLanguage")) {
      console.log(LOG_PREFIX, "storage changed", changes);
      init();
      return;
    }
    if (changedKeys.some((key) => STYLE_SETTING_KEYS.includes(key))) {
      console.log(LOG_PREFIX, "style storage changed", changes);
      restyleActiveSession();
    }
  });

  window.addEventListener("yt-navigate-finish", init);

  console.log(LOG_PREFIX, "content script loaded");
  init();
})();
