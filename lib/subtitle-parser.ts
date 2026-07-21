export type Cue = {
  start: number; // seconds
  end: number; // seconds
  text: string;
};

function timeToSeconds(t: string): number {
  // handles "00:01:02,340" (srt) and "00:01:02.340" (vtt)
  const clean = t.replace(",", ".").trim();
  const parts = clean.split(":");
  const [h, m, s] = parts.length === 3 ? parts : ["0", ...parts];
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/** Parses .srt file content into cues. */
export function parseSrt(content: string): Cue[] {
  const blocks = content
    .replace(/\r/g, "")
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const timeLineIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeLineIdx === -1) continue;

    const [startStr, endStr] = lines[timeLineIdx].split("-->").map((s) => s.trim());
    const text = lines
      .slice(timeLineIdx + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (!text) continue;
    cues.push({
      start: timeToSeconds(startStr),
      end: timeToSeconds(endStr.split(" ")[0]),
      text,
    });
  }
  return cues;
}

/** Parses .vtt file content into cues. */
export function parseVtt(content: string): Cue[] {
  const withoutHeader = content.replace(/\r/g, "").replace(/^WEBVTT.*\n/, "");
  const blocks = withoutHeader
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const timeLineIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeLineIdx === -1) continue;

    const [startStr, endStr] = lines[timeLineIdx].split("-->").map((s) => s.trim());
    const text = lines
      .slice(timeLineIdx + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (!text) continue;
    cues.push({
      start: timeToSeconds(startStr),
      end: timeToSeconds(endStr.split(" ")[0]),
      text,
    });
  }
  return cues;
}

/** Auto-detects format from file extension and parses accordingly. */
export function parseSubtitleFile(filePath: string, content: string): Cue[] {
  return filePath.endsWith(".vtt") ? parseVtt(content) : parseSrt(content);
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
