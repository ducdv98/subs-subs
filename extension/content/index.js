(async () => {
  const { parseSettings } = await import(chrome.runtime.getURL("lib/settings.js"));
  const { computeRenderDecision, derivePrimaryTrackChange } = await import(
    chrome.runtime.getURL("lib/subtitle-engine.js")
  );
  const { getPlayer, getTrackList, getActiveTrack, enableCaptions, getVideoId, waitFor } =
    await import(chrome.runtime.getURL("content/player.js"));
  const { parseVtt } = await import(chrome.runtime.getURL("content/vtt.js"));

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

  async function fetchSecondaryCues(primaryLanguageCode, secondaryLanguage, videoId) {
    const url = `https://www.youtube.com/api/timedtext?lang=${encodeURIComponent(primaryLanguageCode)}&tlang=${encodeURIComponent(secondaryLanguage)}&v=${encodeURIComponent(videoId)}&fmt=vtt`;
    const response = await fetch(url);
    if (!response.ok) return [];
    return parseVtt(await response.text());
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
    const player = await waitFor(getPlayer);
    if (!player) return;

    const tracklist = getTrackList(player);
    if (tracklist.length === 0) return;

    enableCaptions();
    const activeTrack = await waitFor(() => {
      const track = getActiveTrack(player);
      return track && track.languageCode ? track : null;
    });
    if (!activeTrack) return;

    const video = player.querySelector("video");
    if (!video) return;

    let primaryLanguageCode = activeTrack.languageCode;
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
      let languageCode = startLanguageCode;
      for (;;) {
        secondaryCues = null;
        const { fetchRequired } = derivePrimaryTrackChange({
          primaryLanguageCode: languageCode,
          secondaryLanguage: settings.secondaryLanguage,
        });
        const cues = fetchRequired
          ? await fetchSecondaryCues(languageCode, settings.secondaryLanguage, getVideoId())
          : null;
        if (cancelled) return;

        primaryLanguageCode = languageCode;
        secondaryCues = cues;

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
    if (!settings.dualSubMode) return;

    await startSession(settings);
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if ("dualSubMode" in changes || "secondaryLanguage" in changes) {
      init();
    }
  });

  window.addEventListener("yt-navigate-finish", init);

  init();
})();
