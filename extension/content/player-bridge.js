(() => {
  const STATE_ATTR = "data-dual-subs-player-state";
  const VTT_EVENT = "dual-subs-secondary-vtt";
  const SET_ACTIVE_TRACK_EVENT = "dual-subs-set-active-track";
  const PLAYER_STATE_EVENT = "dual-subs-player-state-changed";

  function getCaptionTracks() {
    const player = document.getElementById("movie_player");
    if (!player || typeof player.getPlayerResponse !== "function") return [];
    const response = player.getPlayerResponse();
    return response?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  }

  function readPlayerState() {
    const player = document.getElementById("movie_player");
    if (!player || typeof player.getOption !== "function") {
      return { ready: false, trackCount: 0, activeLanguageCode: null };
    }
    // player.getOption("captions", "tracklist") omits ASR-only (auto-generated)
    // tracks for videos with no manual captions, so it under-reports availability.
    // getPlayerResponse().captions includes ASR tracks, so use that as the count.
    const captionTracks = getCaptionTracks();
    const track = player.getOption("captions", "track");
    const activeLanguageCode = track && track.languageCode ? track.languageCode : null;
    return {
      ready: true,
      trackCount: captionTracks.length,
      activeLanguageCode,
    };
  }

  let lastSerializedState = null;

  function publish() {
    const serialized = JSON.stringify(readPlayerState());
    document.documentElement.setAttribute(STATE_ATTR, serialized);
    if (serialized !== lastSerializedState) {
      lastSerializedState = serialized;
      document.dispatchEvent(new CustomEvent(PLAYER_STATE_EVENT));
    }
  }

  // Reacts to the player's own DOM mutations (caption window/button state)
  // instead of polling on a fixed interval — YouTube redraws these on every
  // caption track change, so this fires within a frame instead of up to
  // 250ms late. No documented player API event exists for track changes
  // (see US-010 design notes), so DOM mutation is the closest signal.
  let stateObserver = null;
  function observePlayer(player) {
    if (stateObserver) stateObserver.disconnect();
    stateObserver = new MutationObserver(publish);
    stateObserver.observe(player, { attributes: true, childList: true, subtree: true });
  }

  // Watching starts as soon as the player element exists, not gated on
  // captions being confirmed active, so a switch during the startup/ad
  // window is reflected the moment captions do become active.
  function watchForPlayer() {
    const existing = document.getElementById("movie_player");
    if (existing) {
      observePlayer(existing);
      return;
    }
    const bootstrapObserver = new MutationObserver(() => {
      const player = document.getElementById("movie_player");
      if (!player) return;
      bootstrapObserver.disconnect();
      observePlayer(player);
      publish();
    });
    bootstrapObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  publish();
  watchForPlayer();

  // YouTube's own CC "Auto-translate" menu drives its player to issue a
  // first-party `timedtext?tlang=` request that carries a valid PoToken (see
  // docs/research/pototoken-timedtext.md) — direct fetches from our content
  // script don't. So instead of fetching ourselves, we let the page's own
  // fetch fire (triggered by content/player.js's menu automation) and just
  // eavesdrop on the response here, in the same MAIN world the page's fetch
  // runs in.
  function isTimedtextTranslateUrl(urlString) {
    let url;
    try {
      url = new URL(urlString, location.href);
    } catch {
      return null;
    }
    if (!url.pathname.includes("/api/timedtext")) return null;
    const tlang = url.searchParams.get("tlang");
    if (!tlang) return null;
    return { tlang, sourceLanguageCode: url.searchParams.get("lang") };
  }

  function publishCapturedVtt({ tlang, sourceLanguageCode, vttText }) {
    document.dispatchEvent(
      new CustomEvent(VTT_EVENT, {
        detail: { tlang, sourceLanguageCode, vttText, capturedAt: Date.now() },
      }),
    );
  }

  const originalFetch = window.fetch;
  window.fetch = async function patchedFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url;
    const match = url ? isTimedtextTranslateUrl(url) : null;
    const response = await originalFetch.call(this, input, init);
    if (match) {
      // .clone() so YouTube's own player still gets to consume the body.
      response
        .clone()
        .text()
        .then((vttText) => publishCapturedVtt({ ...match, vttText }))
        .catch(() => {});
    }
    return response;
  };

  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const REQUEST_URL = Symbol("dual-subs-request-url");
  XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
    this[REQUEST_URL] = url;
    return originalXhrOpen.call(this, method, url, ...rest);
  };

  const originalXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function patchedSend(...args) {
    const match = isTimedtextTranslateUrl(this[REQUEST_URL] ?? "");
    if (match) {
      this.addEventListener("load", () => {
        publishCapturedVtt({ ...match, vttText: this.responseText ?? "" });
      });
    }
    return originalXhrSend.apply(this, args);
  };

  document.addEventListener(SET_ACTIVE_TRACK_EVENT, (event) => {
    const player = document.getElementById("movie_player");
    if (!player || typeof player.setOption !== "function") return;
    const languageCode = event.detail?.languageCode;
    if (!languageCode) return;
    player.setOption("captions", "track", { languageCode });
  });
})();
