import "dotenv/config";
import { findLessonFiles, ingestLessons, SUBTITLES_DIR } from "../lib/ingest-lesson";
import { clearIndex } from "../lib/vector-store";

/**
 * Full rebuild: scans data/subtitles from scratch, clears the entire Qdrant
 * collection, and re-indexes every lesson found on disk. Use this after bulk
 * edits/renames. For adding a handful of new lessons without disturbing the
 * rest of the index, use the admin dashboard's "Add transcripts" panel
 * instead (POST /api/admin/upload), which calls ingestLessons() directly
 * without clearing the collection first.
 */
async function main() {
  console.log(`Scanning ${SUBTITLES_DIR} ...`);
  const lessonFiles = await findLessonFiles(SUBTITLES_DIR);
  console.log(`Found ${lessonFiles.length} lessons.`);

  console.log("Clearing existing Qdrant collection...");
  await clearIndex();

  const { chunkCount } = await ingestLessons(lessonFiles, (line) => process.stdout.write(line));

  console.log(`Done. Indexed ${chunkCount} chunks in the "course_chunks" collection.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});