const TIMESTAMP_RE = /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/;

function timeToSeconds(timestamp) {
  const [hours, minutes, seconds] = timestamp.split(":");
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

// YouTube's own player (and thus the native CC "Auto-translate" menu request
// we capture in content/player-bridge.js) requests captions in its internal
// json3 format, not vtt — `{ events: [{ tStartMs, dDurationMs, segs: [{utf8}] }] }`.
export function parseJson3(json3Text) {
  let data;
  try {
    data = JSON.parse(json3Text);
  } catch {
    return null;
  }
  if (!data || !Array.isArray(data.events)) return null;

  const cues = [];
  for (const event of data.events) {
    if (typeof event.tStartMs !== "number" || !Array.isArray(event.segs)) continue;
    const text = event.segs
      .map((seg) => seg.utf8 ?? "")
      .join("")
      .replace(/\n/g, " ")
      .trim();
    if (text.length === 0) continue;
    const startTime = event.tStartMs / 1000;
    const endTime = startTime + (event.dDurationMs ?? 0) / 1000;
    cues.push({ startTime, endTime, text });
  }
  return cues;
}

export function parseVtt(vttText) {
  const cues = [];
  const blocks = vttText.replace(/\r\n/g, "\n").split("\n\n");

  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.length > 0);
    const timestampLine = lines.find((line) => TIMESTAMP_RE.test(line));
    if (!timestampLine) continue;

    const match = timestampLine.match(TIMESTAMP_RE);
    const startTime = timeToSeconds(match[1]);
    const endTime = timeToSeconds(match[2]);
    const text = lines
      .slice(lines.indexOf(timestampLine) + 1)
      .join(" ")
      .trim();

    if (text.length > 0) {
      cues.push({ startTime, endTime, text });
    }
  }

  return cues;
}
