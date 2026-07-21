import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "node:crypto";

/** Turns on public read-only sharing for a conversation, returning its share token. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({ where: { id, userId } });
  if (!conversation) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  const shareToken = conversation.shareToken ?? randomBytes(9).toString("base64url");

  const updated = await prisma.conversation.update({
    where: { id },
    data: { isPublic: true, shareToken },
  });

  return Response.json({ shareToken: updated.shareToken });
}

/** Turns off public sharing for a conversation. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({ where: { id, userId } });
  if (!conversation) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  await prisma.conversation.update({ where: { id }, data: { isPublic: false } });
  return Response.json({ ok: true });
}
