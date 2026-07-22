import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { CreateConversationSchema } from "@/lib/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  return Response.json({ conversation });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { id } = await params;
  const existing = await prisma.conversation.findFirst({ where: { id, userId } });
  if (!existing) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const parsed = CreateConversationSchema.safeParse(body);
  if (!parsed.success || !parsed.data.title) {
    return new Response(
      JSON.stringify({ error: "title is required (1-200 chars)" }),
      { status: 400 }
    );
  }

  const conversation = await prisma.conversation.update({
    where: { id },
    data: { title: parsed.data.title },
  });

  return Response.json({ conversation });
}

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

  await prisma.conversation.delete({ where: { id } });
  return Response.json({ ok: true });
}