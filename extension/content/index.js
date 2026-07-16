(async () => {
  const { parseSettings } = await import(chrome.runtime.getURL("lib/settings.js"));
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

  function injectSecondaryLine(player) {
    removeSecondaryLine();
    const el = document.createElement("div");
    el.id = SECONDARY_LINE_ID;
    el.style.cssText =
      "position:absolute;bottom:8%;left:0;right:0;text-align:center;" +
      "font-size:1.5vw;line-height:1.4;color:rgba(255,255,255,0.75);" +
      "text-shadow:1px 1px 2px rgba(0,0,0,0.8);pointer-events:none;z-index:56;";
    player.appendChild(el);
    return el;
  }

  const VTT_EVENT = "dual-subs-secondary-vtt";
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
      clearInterval(activeSession.trackWatchIntervalId);
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

    enableCaptions();
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

    const secondaryLanguageKnown = isKnownSecondaryLanguage(settings.secondaryLanguage);
    if (!secondaryLanguageKnown) {
      console.error(
        LOG_PREFIX,
        `secondaryLanguage "${settings.secondaryLanguage}" is not a recognized language code — check Options`,
      );
    }

    let primaryLanguageCode = activeTrack.languageCode;
    let secondaryCues = null;
    let fetchingSecondary = false;
    let cancelled = false;

    console.log(LOG_PREFIX, "active track", {
      primaryLanguageCode,
      secondaryLanguage: settings.secondaryLanguage,
    });

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

    function checkForTrackChange() {
      if (fetchingSecondary || cancelled) return;
      const liveLanguageCode = currentLiveLanguageCode(primaryLanguageCode);
      if (liveLanguageCode === primaryLanguageCode) return;

      fetchingSecondary = true;
      settleSecondaryCues(liveLanguageCode).finally(() => {
        fetchingSecondary = false;
      });
    }

    await settleSecondaryCues(primaryLanguageCode);

    const secondaryLineEl = injectSecondaryLine(player);

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

    // Polls independently of `timeupdate` so a manual track switch is
    // still detected while the video is paused.
    const trackWatchIntervalId = setInterval(checkForTrackChange, 500);

    video.addEventListener("timeupdate", onTimeUpdate);
    activeSession = {
      video,
      onTimeUpdate,
      trackWatchIntervalId,
      cancel: () => {
        cancelled = true;
      },
    };
  }

  async function init() {
    stopSession();

    const raw = await chrome.storage.local.get(["dualSubMode", "secondaryLanguage"]);
    const settings = parseSettings(raw);
    console.log(LOG_PREFIX, "init", { raw, settings });
    if (!settings.dualSubMode) {
      console.log(LOG_PREFIX, "dualSubMode is off, not starting");
      return;
    }

    await startSession(settings);
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if ("dualSubMode" in changes || "secondaryLanguage" in changes) {
      console.log(LOG_PREFIX, "storage changed", changes);
      init();
    }
  });

  window.addEventListener("yt-navigate-finish", init);

  console.log(LOG_PREFIX, "content script loaded");
  init();
})();
