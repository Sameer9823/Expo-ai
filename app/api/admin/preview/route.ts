import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { parseSubtitleFile } from "@/lib/subtitle-parser";
import { chunkCues } from "@/lib/chunker";
import { isAdmin } from "@/lib/admin";

const SUBTITLES_DIR = path.join(process.cwd(), "data", "subtitles");

/**
 * Chunk-quality preview: parses one lesson's subtitle file and returns the
 * chunks the ingest pipeline would produce, WITHOUT calling OpenAI — lets an
 * admin sanity-check chunk boundaries before spending embedding tokens.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  if (!isAdmin(userId)) {
    return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403 });
  }

  const moduleDir = req.nextUrl.searchParams.get("module");
  const lessonDir = req.nextUrl.searchParams.get("lesson");
  if (!moduleDir || !lessonDir) {
    return new Response(JSON.stringify({ error: "module and lesson query params are required" }), {
      status: 400,
    });
  }

  try {
    const lessonPath = path.join(SUBTITLES_DIR, moduleDir, lessonDir);
    const files = await fs.readdir(lessonPath);
    const subtitleFile = files.find((f) => f.endsWith(".srt") || f.endsWith(".vtt"));
    if (!subtitleFile) {
      return new Response(JSON.stringify({ error: "No .srt/.vtt file found for this lesson" }), {
        status: 404,
      });
    }

    const filePath = path.join(lessonPath, subtitleFile);
    const content = await fs.readFile(filePath, "utf-8");
    const cues = parseSubtitleFile(filePath, content);
    const chunks = chunkCues(cues, moduleDir, lessonDir);

    return Response.json({
      cueCount: cues.length,
      chunkCount: chunks.length,
      chunks: chunks.slice(0, 10), // preview first 10 for a quick sanity check
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Failed to preview lesson" }),
      { status: 500 }
    );
  }
}