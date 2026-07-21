import { Cue, formatTimestamp } from "./subtitle-parser";

export type Chunk = {
  id: string;
  text: string;
  module: string;
  lesson: string;
  startTime: number;
  endTime: number;
  timestamp: string; // formatted "mm:ss" of chunk start
};

const WINDOW_SECONDS = 40;
const MIN_CHUNK_CHARS = 80;

/**
 * Merges consecutive cues into ~WINDOW_SECONDS windows. Per-caption lines
 * are too small individually to retrieve well, so we group them while
 * keeping the start timestamp of the window for citation purposes.
 */
export function chunkCues(
  cues: Cue[],
  module: string,
  lesson: string
): Chunk[] {
  const chunks: Chunk[] = [];
  let windowCues: Cue[] = [];
  let windowStart = cues[0]?.start ?? 0;

  const flush = () => {
    if (windowCues.length === 0) return;
    const text = windowCues.map((c) => c.text).join(" ").replace(/\s+/g, " ").trim();
    if (text.length < MIN_CHUNK_CHARS && chunks.length > 0) {
      // too short on its own — merge into previous chunk instead of
      // creating a low-value fragment
      const prev = chunks[chunks.length - 1];
      prev.text = `${prev.text} ${text}`.trim();
      prev.endTime = windowCues[windowCues.length - 1].end;
    } else if (text) {
      const end = windowCues[windowCues.length - 1].end;
      chunks.push({
        id: `${module}::${lesson}::${windowStart.toFixed(0)}`,
        text,
        module,
        lesson,
        startTime: windowStart,
        endTime: end,
        timestamp: formatTimestamp(windowStart),
      });
    }
    windowCues = [];
  };

  for (const cue of cues) {
    if (windowCues.length === 0) windowStart = cue.start;
    windowCues.push(cue);
    if (cue.end - windowStart >= WINDOW_SECONDS) {
      flush();
    }
  }
  flush();

  return chunks;
}
