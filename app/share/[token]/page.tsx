"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock } from "lucide-react";

type SharedMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: { module: string; lesson: string; timestamp: string }[];
  blocked?: boolean;
};

export default function SharedConversationPage() {
  const params = useParams<{ token: string }>();
  const [title, setTitle] = useState<string>("");
  const [messages, setMessages] = useState<SharedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${params.token}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load");
        setTitle(data.title);
        setMessages(data.messages);
      })
      .catch((e) => setError(e.message));
  }, [params.token]);

  return (
    <main className="min-h-screen bg-base px-4 py-10 text-primary sm:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="mb-1 text-xs uppercase tracking-wide text-muted">
          Shared conversation · <span className="text-accent">lesson.search</span>
        </p>
        <h1 className="font-display text-xl font-bold">{title || "Conversation"}</h1>

        {error && <p className="mt-6 text-sm text-accent">{error}</p>}

        <div className="mt-6 flex flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xl ${m.role === "user" ? "" : "w-full"}`}>
                <div
                  className={
                    m.role === "user"
                      ? "rounded-2xl bg-surface2 px-4 py-2.5 text-sm"
                      : "rounded-2xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed"
                  }
                >
                  {m.blocked ? (
                    <p className="text-accent">{m.content}</p>
                  ) : (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
                {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {m.sources.map((s, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-2 rounded-lg border border-border bg-surface2 px-3 py-2"
                      >
                        <Clock size={14} className="shrink-0 text-cite" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{s.lesson}</p>
                          <p className="truncate text-[11px] text-muted">{s.module}</p>
                        </div>
                        <span className="ml-auto shrink-0 font-mono text-xs text-cite">{s.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted">
          Read-only view. <a href="/" className="text-accent hover:underline">Ask your own questions →</a>
        </p>
      </div>
    </main>
  );
}
