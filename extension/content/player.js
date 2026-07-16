export function getPlayer() {
  const player = document.getElementById("movie_player");
  return player && typeof player.getOption === "function" ? player : null;
}

export function getTrackList(player) {
  return player.getOption("captions", "tracklist") || [];
}

export function getActiveTrack(player) {
  return player.getOption("captions", "track");
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

export function getVideoId() {
  return new URL(window.location.href).searchParams.get("v");
}

export function waitFor(predicate, { intervalMs = 200, timeoutMs = 10000 } = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const value = predicate();
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
