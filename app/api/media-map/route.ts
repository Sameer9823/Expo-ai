import { auth } from "@clerk/nextjs/server";
import { loadMediaMap } from "@/lib/media-map.server";

/** Returns the full lesson -> media URL map so the client can resolve a
 *  source card's (module, lesson) into a playable URL without a round
 *  trip per click. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const map = await loadMediaMap();
  return Response.json({ map });
}
