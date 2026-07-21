import fs from "node:fs/promises";
import path from "node:path";

const MEDIA_MAP_PATH = path.join(process.cwd(), "data", "media-map.json");

/**
 * Loads the lesson -> media URL map. This repo ships only subtitle
 * transcripts (no video/audio files), so the map starts empty/templated —
 * fill in `data/media-map.json` with your actual hosted video or audio URLs
 * per lesson to enable the "click timestamp to seek" player.
 *
 * Server-only (uses node:fs) — import this from route handlers or server
 * components only. Never import it from a "use client" file; use
 * `mediaKey` from `lib/media-map.ts` there instead.
 */
export async function loadMediaMap(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(MEDIA_MAP_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const { _readme, ...map } = parsed;
    return map as Record<string, string>;
  } catch {
    return {};
  }
}
