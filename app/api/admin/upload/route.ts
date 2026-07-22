import { auth } from "@clerk/nextjs/server";
import fs from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/admin";
import {
  SUBTITLES_DIR,
  cleanLessonName,
  safeSegment,
  findSubtitleFileInDir,
  ingestLessons,
  type LessonFile,
} from "@/lib/ingest-lesson";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_EXTENSIONS = [".srt", ".vtt"];

/**
 * Lets an admin add more transcripts straight from the dashboard, in two
 * shapes:
 *
 *  - mode=single: one `module` + `lesson` text field, plus one or more
 *    subtitle files. Used to add/replace a single lesson.
 *  - mode=folder: a whole directory tree selected via a <input webkitdirectory>
 *    picker. Each file arrives paired with its relative path (e.g.
 *    "module 13/04-new-lesson/en.srt") in a same-index `paths` field, and we
 *    recreate that module/lesson structure under data/subtitles.
 *
 * After writing files to disk, only the affected lessons are parsed,
 * chunked, embedded, and upserted into Qdrant (see ingestLessons) — the rest
 * of the index is left untouched, so this is safe to run repeatedly without
 * a full re-ingest.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  if (!isAdmin(userId)) {
    return new Response(JSON.stringify({ error: "Not authorized to upload transcripts" }), { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), { status: 400 });
  }

  const mode = (form.get("mode") as string) || "single";
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return new Response(JSON.stringify({ error: "No files were uploaded" }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line })}\n\n`));
      };

      try {
        // Every (moduleDirRaw, lessonDirRaw) pair we touch, so we only ever
        // re-parse+embed the lessons actually affected by this upload.
        const touchedLessonDirs = new Map<string, { moduleDirRaw: string; lessonDirRaw: string; absDir: string }>();

        if (mode === "single") {
          const moduleRaw = ((form.get("module") as string) || "").trim();
          const lessonRaw = ((form.get("lesson") as string) || "").trim();
          if (!moduleRaw || !lessonRaw) {
            send("Error: module and lesson are required for a single-lesson upload.\n");
            controller.close();
            return;
          }

          const moduleDirRaw = safeSegment(moduleRaw);
          const lessonDirRaw = safeSegment(lessonRaw);
          const absDir = path.join(SUBTITLES_DIR, moduleDirRaw, lessonDirRaw);
          await fs.mkdir(absDir, { recursive: true });

          for (const file of files) {
            const ext = path.extname(file.name).toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
              send(`Skipped "${file.name}": only .srt/.vtt files are ingested.\n`);
              continue;
            }
            const destName = safeSegment(path.basename(file.name, ext)) + ext;
            const buf = Buffer.from(await file.arrayBuffer());
            await fs.writeFile(path.join(absDir, destName), buf);
            send(`Saved ${moduleDirRaw}/${lessonDirRaw}/${destName}\n`);
          }

          touchedLessonDirs.set(`${moduleDirRaw}/${lessonDirRaw}`, { moduleDirRaw, lessonDirRaw, absDir });
        } else {
          // folder mode: relative paths travel alongside the files
          const paths = form.getAll("paths").map((p) => String(p));
          if (paths.length !== files.length) {
            send("Error: paths[] must match files[] one-to-one for folder uploads.\n");
            controller.close();
            return;
          }

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const rel = paths[i];
            const ext = path.extname(file.name).toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
              continue; // silently skip video/audio/asset files that rode along with the folder
            }

            const parts = rel.split("/").filter(Boolean);
            const fileName = safeSegment(path.basename(parts.pop() ?? file.name));
            const lessonDirRaw = safeSegment(parts.pop() ?? "lesson");
            const moduleDirRaw = safeSegment(parts.pop() ?? "uploaded");

            const absDir = path.join(SUBTITLES_DIR, moduleDirRaw, lessonDirRaw);
            await fs.mkdir(absDir, { recursive: true });
            const buf = Buffer.from(await file.arrayBuffer());
            await fs.writeFile(path.join(absDir, fileName), buf);
            send(`Saved ${moduleDirRaw}/${lessonDirRaw}/${fileName}\n`);

            touchedLessonDirs.set(`${moduleDirRaw}/${lessonDirRaw}`, { moduleDirRaw, lessonDirRaw, absDir });
          }

          if (touchedLessonDirs.size === 0) {
            send("No .srt/.vtt files were found in the uploaded folder.\n");
            controller.close();
            return;
          }
        }

        // Re-scan each touched lesson dir (rather than assuming the just-uploaded
        // file is "the" subtitle file) so this also works when a lesson already
        // had a file and the admin is adding/replacing it.
        const lessonFiles: LessonFile[] = [];
        for (const { moduleDirRaw, lessonDirRaw, absDir } of touchedLessonDirs.values()) {
          const subtitleFile = await findSubtitleFileInDir(absDir);
          if (!subtitleFile) continue;
          lessonFiles.push({
            module: cleanLessonName(moduleDirRaw),
            lesson: cleanLessonName(lessonDirRaw),
            file: subtitleFile,
          });
        }

        send(`\n${lessonFiles.length} lesson(s) ready to index. Embedding + upserting...\n`);
        const { chunkCount } = await ingestLessons(lessonFiles, send);
        send(`\n--- upload + ingest complete: ${chunkCount} chunks indexed across ${lessonFiles.length} lesson(s) ---`);
      } catch (err) {
        send(`\n--- failed: ${err instanceof Error ? err.message : String(err)} ---`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}