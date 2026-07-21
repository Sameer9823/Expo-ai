import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { CreateConversationSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();

  const conversations = await prisma.conversation.findMany({
    where: q
      ? {
          userId,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { messages: { some: { content: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });

  return Response.json({ conversations });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  const conversation = await prisma.conversation.create({
    data: { userId, title: parsed.data.title ?? "New chat" },
  });

  return Response.json({ conversation });
}