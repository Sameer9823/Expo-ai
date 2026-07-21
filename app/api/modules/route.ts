import { auth } from "@clerk/nextjs/server";
import fs from "node:fs/promises";
import path from "node:path";

const SUBTITLES_DIR = path.join(process.cwd(), "data", "subtitles");

/** Lists course modules (derived from the subtitles folder) for the module-filter dropdown. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  try {
    const entries = await fs.readdir(SUBTITLES_DIR, { withFileTypes: true });
    const modules = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return Response.json({ modules });
  } catch {
    return Response.json({ modules: [] });
  }
}
