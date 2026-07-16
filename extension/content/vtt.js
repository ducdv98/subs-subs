const TIMESTAMP_RE = /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/;

function timeToSeconds(timestamp) {
  const [hours, minutes, seconds] = timestamp.split(":");
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
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
