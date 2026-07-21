import { prisma } from "@/lib/db";

/** Public, unauthenticated read of a conversation shared via a share token. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { shareToken: token, isPublic: true },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    return new Response(JSON.stringify({ error: "This shared link is invalid or was revoked." }), {
      status: 404,
    });
  }

  return Response.json({
    title: conversation.title,
    messages: conversation.messages.map(
      (m: { role: string; content: string; sources: unknown; blocked: boolean; createdAt: Date }) => ({
        role: m.role,
        content: m.content,
        sources: m.sources,
        blocked: m.blocked,
        createdAt: m.createdAt,
      })
    ),
  });
}
