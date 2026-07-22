import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { runRagPipeline, PipelineEvent } from "@/lib/rag-pipeline";
import { ChatRequestSchema } from "@/lib/schemas";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { Source } from "@/lib/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

const HISTORY_TURNS = 6; // how many prior messages to feed into query contextualization

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const rateLimit = await checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: `You're asking questions faster than we can answer them. Try again in ${Math.ceil(
          rateLimit.resetInMs / 1000
        )}s.`,
      }),
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetInMs / 1000)) } }
    );
  }

  const parsed = ChatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid request" }),
      { status: 400 }
    );
  }
  const { query, conversationId, moduleFilter } = parsed.data;

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
  });
  if (!conversation) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404 });
  }

  // Conversation memory: hand the pipeline the recent turns so it can
  // resolve follow-ups like "what about part 2?" into a standalone query.
  const history = conversation.messages
    .filter((m: { blocked: boolean }) => !m.blocked)
    .slice(-HISTORY_TURNS)
    .map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  await prisma.message.create({
    data: { conversationId, role: "user", content: query },
  });

  if (conversation.title === "New chat") {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: query.slice(0, 60) },
    });
  }

  const encoder = new TextEncoder();
  let fullAnswer = "";
  let finalSources: Source[] = [];
  let followups: string[] = [];
  let confidence: number | undefined;
  let wasBlocked = false;
  let blockedReason = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent) => {
        if (event.type === "token") fullAnswer += event.value;
        if (event.type === "sources" && event.final) finalSources = event.sources;
        if (event.type === "followups") followups = event.questions;
        if (event.type === "confidence") confidence = event.score;
        if (event.type === "blocked") {
          wasBlocked = true;
          blockedReason = event.reason;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await runRagPipeline(query, send, { history, moduleFilter });
      } catch (err) {
        wasBlocked = true;
        blockedReason = err instanceof Error ? err.message : "Something went wrong.";
        send({ type: "blocked", reason: blockedReason });
      } finally {
        const saved = await prisma.message.create({
          data: {
            conversationId,
            role: "assistant",
            content: wasBlocked ? blockedReason : fullAnswer,
            sources: wasBlocked ? undefined : (finalSources as object),
            followups: wasBlocked ? undefined : followups,
            confidence: wasBlocked ? undefined : confidence,
            blocked: wasBlocked,
          },
        });
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "assistantMessageId", id: saved.id })}\n\n`)
        );
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
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