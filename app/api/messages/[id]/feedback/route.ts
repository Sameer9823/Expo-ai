import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const BodySchema = z.object({
  feedback: z.union([z.literal(1), z.literal(-1), z.null()]),
});

/** Thumbs up/down on an assistant answer. Toggling the same value clears it. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { id } = await params;
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  // Make sure the message belongs to a conversation owned by this user.
  const message = await prisma.message.findFirst({
    where: { id, conversation: { userId } },
  });
  if (!message) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  const updated = await prisma.message.update({
    where: { id },
    data: { feedback: parsed.data.feedback },
  });

  return Response.json({ feedback: updated.feedback });
}
