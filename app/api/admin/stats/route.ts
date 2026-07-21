import { auth } from "@clerk/nextjs/server";
import fs from "node:fs/promises";
import path from "node:path";
import { qdrant, COLLECTION_NAME } from "@/lib/qdrant";

const SUBTITLES_DIR = path.join(process.cwd(), "data", "subtitles");

async function listLessons() {
  const modules = await fs.readdir(SUBTITLES_DIR, { withFileTypes: true });
  const out: { module: string; lesson: string; hasSubtitles: boolean }[] = [];

  for (const moduleDir of modules.filter((d) => d.isDirectory())) {
    const modulePath = path.join(SUBTITLES_DIR, moduleDir.name);
    const lessonDirs = await fs.readdir(modulePath, { withFileTypes: true });
    for (const lessonDir of lessonDirs.filter((d) => d.isDirectory())) {
      const lessonPath = path.join(modulePath, lessonDir.name);
      const files = await fs.readdir(lessonPath);
      const hasSubtitles = files.some((f) => f.endsWith(".srt") || f.endsWith(".vtt"));
      out.push({ module: moduleDir.name, lesson: lessonDir.name, hasSubtitles });
    }
  }
  return out;
}

/** Ingestion dashboard stats: lessons on disk + how many chunks are indexed in Qdrant. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const lessons = await listLessons();

  let indexedChunks: number | null = null;
  let qdrantError: string | null = null;
  try {
    const info = await qdrant.getCollection(COLLECTION_NAME);
    indexedChunks = info.points_count ?? null;
  } catch (err) {
    qdrantError = err instanceof Error ? err.message : "Could not reach Qdrant";
  }

  return Response.json({
    totalLessons: lessons.length,
    lessonsWithSubtitles: lessons.filter((l) => l.hasSubtitles).length,
    indexedChunks,
    qdrantError,
    lessons,
  });
}
