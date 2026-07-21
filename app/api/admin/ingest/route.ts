import { auth } from "@clerk/nextjs/server";
import { spawn } from "node:child_process";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Triggers `npm run ingest` as a child process and streams its stdout/stderr
 * back as server-sent events, so the admin dashboard can show live progress
 * instead of only working via the CLI.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  if (!isAdmin(userId)) {
    return new Response(JSON.stringify({ error: "Not authorized to run ingestion" }), { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (line: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line })}\n\n`));
      };

      const child = spawn("npm", ["run", "ingest"], {
        cwd: process.cwd(),
        env: process.env,
      });

      child.stdout.on("data", (chunk) => send(chunk.toString()));
      child.stderr.on("data", (chunk) => send(chunk.toString()));

      child.on("close", (code) => {
        send(`\n--- ingestion process exited with code ${code} ---`);
        controller.close();
      });

      child.on("error", (err) => {
        send(`\n--- failed to start ingestion: ${err.message} ---`);
        controller.close();
      });
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