import "dotenv/config";
import fs from "fs";
import path from "path";
import { parseSubtitleFile } from "../lib/subtitle-parser";
import { chunkCues } from "../lib/chunker";
import { embedTexts } from "../lib/llm";
import { clearIndex, insertChunks, VectorRecord } from "../lib/vector-store";

const SUBTITLES_DIR = path.join(process.cwd(), "data", "subtitles");

function cleanLessonName(raw: string): string {
  return raw
    .replace(/_epm$/i, "")
    .replace(/^\d+[._]\s*/, "")
    .replace(/^chapter-?\d+[-\s]*/i, "")
    .replace(/[-_]/g, " ")
    .trim();
}

function findLessonFiles(dir: string): { module: string; lesson: string; file: string }[] {
  const results: { module: string; lesson: string; file: string }[] = [];
  const modules = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const moduleDir of modules) {
    const modulePath = path.join(dir, moduleDir.name);
    const lessonDirs = fs.readdirSync(modulePath, { withFileTypes: true }).filter((d) => d.isDirectory());

    for (const lessonDir of lessonDirs) {
      const lessonPath = path.join(modulePath, lessonDir.name);
      const files = fs.readdirSync(lessonPath);
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

async function main() {
  console.log(`Scanning ${SUBTITLES_DIR} ...`);
  const lessonFiles = findLessonFiles(SUBTITLES_DIR);
  console.log(`Found ${lessonFiles.length} lessons.`);

  const allChunks: ReturnType<typeof chunkCues> = [];

  for (const { module, lesson, file } of lessonFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const cues = parseSubtitleFile(file, content);
    const chunks = chunkCues(cues, module, lesson);
    allChunks.push(...chunks);
  }

  console.log(`Built ${allChunks.length} chunks. Embedding...`);

  const BATCH = 200;
  const records: VectorRecord[] = [];
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const embeddings = await embedTexts(batch.map((c) => c.text));
    batch.forEach((chunk, j) => {
      records.push({ ...chunk, embedding: embeddings[j] });
    });
    console.log(`  embedded ${Math.min(i + BATCH, allChunks.length)}/${allChunks.length}`);
  }

  console.log("Clearing existing Qdrant collection...");
  await clearIndex();

  console.log(`Inserting ${records.length} chunks into Qdrant...`);
  await insertChunks(records);

  console.log(`Done. Indexed ${records.length} chunks in the "course_chunks" collection.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});