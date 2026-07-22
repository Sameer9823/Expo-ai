import fs from "node:fs/promises";
import path from "node:path";
import { parseSubtitleFile } from "./subtitle-parser";
import { chunkCues, type Chunk } from "./chunker";
import { embedTexts } from "./llm";
import { insertChunks, type VectorRecord } from "./vector-store";

export const SUBTITLES_DIR = path.join(process.cwd(), "data", "subtitles");

export type LessonFile = { module: string; lesson: string; file: string };

/**
 * Turns a raw folder name ("03_setting-up-env_epm") into the display name
 * used in citations and the chat UI ("setting up env"). Shared between the
 * full CLI ingest and the admin "add transcripts" upload flow so both
 * produce identically-formatted module/lesson labels.
 */
export function cleanLessonName(raw: string): string {
  return raw
    .replace(/_epm$/i, "")
    .replace(/^\d+[._]\s*/, "")
    .replace(/^chapter-?\d+[-\s]*/i, "")
    .replace(/[-_]/g, " ")
    .trim();
}

/**
 * Removes path separators, ".." traversal, and control characters from a
 * single path segment supplied by an admin upload (module/lesson/file name).
 * Every segment written to disk goes through this first, so a crafted
 * relative path can't escape the subtitles directory.
 */
export function safeSegment(raw: string): string {
  const cleaned = raw
    .replace(/\.\./g, "")
    .replace(/[\/\\]/g, "-")
    .replace(/[\x00-\x1f]/g, "")
    .trim();
  return cleaned || "untitled";
}

/** Walks data/subtitles and returns one lesson entry per lesson folder that has a .srt/.vtt file. */
export async function findLessonFiles(dir: string = SUBTITLES_DIR): Promise<LessonFile[]> {
  const results: LessonFile[] = [];
  const modules = (await fs.readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory());

  for (const moduleDir of modules) {
    const modulePath = path.join(dir, moduleDir.name);
    const lessonDirs = (await fs.readdir(modulePath, { withFileTypes: true })).filter((d) => d.isDirectory());

    for (const lessonDir of lessonDirs) {
      const lessonPath = path.join(modulePath, lessonDir.name);
      const files = await fs.readdir(lessonPath);
      const srt = files.find((f) => f.endsWith(".srt"));
      const vtt = files.find((f) => f.endsWith(".vtt"));
      const chosen = srt ?? vtt;
      if (!chosen) continue;

      results.push({
        module: cleanLessonName(moduleDir.name),
        lesson: cleanLessonName(lessonDir.name),
        file: path.join(lessonPath, chosen),
      });
    }
  }
  return results;
}

/** Given an absolute lesson directory, finds whichever .srt/.vtt file should be ingested for it (srt preferred). */
export async function findSubtitleFileInDir(lessonAbsDir: string): Promise<string | null> {
  const files = await fs.readdir(lessonAbsDir);
  const srt = files.find((f) => f.endsWith(".srt"));
  const vtt = files.find((f) => f.endsWith(".vtt"));
  const chosen = srt ?? vtt;
  return chosen ? path.join(lessonAbsDir, chosen) : null;
}

/**
 * Parses, chunks, embeds, and upserts a list of lessons. Because
 * insertChunks() upserts by a deterministic chunk id (module::lesson::time),
 * this is safe to call repeatedly for a subset of lessons — it will
 * overwrite/refresh only those lessons' chunks and leaves every other
 * already-indexed lesson in Qdrant untouched. This is what lets the admin
 * dashboard "add more transcripts" incrementally instead of re-running a
 * full clear + rebuild of the entire collection.
 */
export async function ingestLessons(
  lessonFiles: LessonFile[],
  onLog: (line: string) => void
): Promise<{ chunkCount: number }> {
  const allChunks: Chunk[] = [];

  for (const { module, lesson, file } of lessonFiles) {
    const content = await fs.readFile(file, "utf-8");
    const cues = parseSubtitleFile(file, content);
    const chunks = chunkCues(cues, module, lesson);
    allChunks.push(...chunks);
    onLog(`Parsed ${module} / ${lesson}: ${cues.length} cues -> ${chunks.length} chunks\n`);
  }

  if (allChunks.length === 0) {
    onLog("No chunks to index (empty or unparseable subtitle files).\n");
    return { chunkCount: 0 };
  }

  onLog(`Built ${allChunks.length} chunks total. Embedding...\n`);

  const BATCH = 200;
  const records: VectorRecord[] = [];
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const embeddings = await embedTexts(batch.map((c) => c.text));
    batch.forEach((chunk, j) => records.push({ ...chunk, embedding: embeddings[j] }));
    onLog(`  embedded ${Math.min(i + BATCH, allChunks.length)}/${allChunks.length}\n`);
  }

  onLog(`Upserting ${records.length} chunks into Qdrant (existing lessons are left untouched)...\n`);
  await insertChunks(records);
  onLog(`Done. Indexed ${records.length} chunks.\n`);

  return { chunkCount: records.length };
}