"use client";

import { useEffect, useRef, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Download, Share2, Filter, Check, LayoutDashboard } from "lucide-react";
import { MessageBubble, ChatMessage } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { LessonPlayer, ActivePlayback } from "@/components/chat/LessonPlayer";
import { Source } from "@/components/chat/SourceCard";
import { mediaKey } from "@/lib/media-map";

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [modules, setModules] = useState<string[]>([]);
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});
  const [playback, setPlayback] = useState<ActivePlayback | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    fetch("/api/modules").then((r) => r.json()).then((d) => setModules(d.modules ?? []));
    fetch("/api/media-map").then((r) => r.json()).then((d) => setMediaMap(d.map ?? {}));
  }, []);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const ensureConversation = async (): Promise<string> => {
    if (conversationId) return conversationId;
    const res = await fetch("/api/conversations", { method: "POST", body: JSON.stringify({}) });
    const { conversation } = await res.json();
    setConversationId(conversation.id);
    setRefreshKey((k) => k + 1);
    return conversation.id;
  };

  const loadConversation = async (id: string) => {
    setConversationId(id);
    setPlayback(null);
    const res = await fetch(`/api/conversations/${id}`);
    const { conversation } = await res.json();
    setMessages(
      conversation.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources ?? undefined,
        followups: m.followups ?? undefined,
        confidence: m.confidence ?? undefined,
        feedback: m.feedback ?? null,
        blocked: m.blocked,
      }))
    );
    scrollToBottom();
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setPlayback(null);
  };

  const streamResponse = async (query: string, convoId: string) => {
    setMessages((m) => [...m, { role: "assistant", content: "", status: "Checking your question" }]);
    setBusy(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, conversationId: convoId, moduleFilter: moduleFilter || undefined }),
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = {
            role: "assistant",
            content: body.error ?? "You're sending questions too fast. Please slow down.",
            blocked: true,
          };
          return next;
        });
        return;
      }

      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const updateLast = (patch: Partial<ChatMessage>) => {
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { ...next[next.length - 1], ...patch };
          return next;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          const event = JSON.parse(line);

          if (event.type === "status") {
            updateLast({ status: event.step });
          } else if (event.type === "token") {
            setMessages((m) => {
              const next = [...m];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, content: (last.content ?? "") + event.value };
              return next;
            });
          } else if (event.type === "sources") {
            // Streaming source cards: shown progressively, before the answer
            // finishes generating. `final` flips off the pending/pulse state.
            updateLast({ sources: event.sources, sourcesPending: !event.final });
          } else if (event.type === "confidence") {
            updateLast({ confidence: event.score });
          } else if (event.type === "followups") {
            updateLast({ followups: event.questions });
          } else if (event.type === "assistantMessageId") {
            updateLast({ id: event.id });
          } else if (event.type === "blocked") {
            updateLast({ content: event.reason, blocked: true });
          }
          scrollToBottom();
        }
      }
      setRefreshKey((k) => k + 1); // refresh sidebar title/order
    } catch {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = {
          role: "assistant",
          content: "Something went wrong reaching the course search. Try again.",
          blocked: true,
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  const send = async (query: string) => {
    const convoId = await ensureConversation();
    setMessages((m) => [...m, { role: "user", content: query }]);
    await streamResponse(query, convoId);
  };

  const regenerate = async () => {
    if (!conversationId || busy) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((m) => (m[m.length - 1]?.role === "assistant" ? m.slice(0, -1) : m));
    await streamResponse(lastUser.content, conversationId);
  };

  const handleSourceClick = (source: Source) => {
    const url = mediaMap[mediaKey(source.module, source.lesson)] ?? null;
    setPlayback({ source, url });
  };

  const handleFeedback = async (index: number, value: 1 | -1) => {
    const message = messages[index];
    if (!message.id) return;
    const nextValue = message.feedback === value ? null : value; // click again to clear
    setMessages((m) => {
      const next = [...m];
      next[index] = { ...next[index], feedback: nextValue };
      return next;
    });
    await fetch(`/api/messages/${message.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: nextValue }),
    });
  };

  const exportMarkdown = () => {
    const lines: string[] = ["# Conversation export\n"];
    for (const m of messages) {
      if (!m.content) continue;
      lines.push(m.role === "user" ? `### 🙋 Question\n\n${m.content}\n` : `### 🤖 Answer\n\n${m.content}\n`);
      if (m.sources?.length) {
        lines.push(
          "**Sources:**\n" +
            m.sources.map((s) => `- ${s.lesson} (${s.module}) — ${s.timestamp}`).join("\n") +
            "\n"
        );
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "conversation.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareConversation = async () => {
    if (!conversationId) return;
    const res = await fetch(`/api/conversations/${conversationId}/share`, { method: "POST" });
    const { shareToken } = await res.json();
    const url = `${window.location.origin}/share/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setShareState("copied");
    setTimeout(() => setShareState("idle"), 2000);
  };

  return (
    <main className="flex h-screen flex-col bg-gradient-to-b from-base to-[#0d1118] md:flex-row">
      <ConversationSidebar
        activeId={conversationId}
        onSelect={loadConversation}
        onNew={startNewChat}
        refreshKey={refreshKey}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border bg-surface/60 px-3 py-3 backdrop-blur sm:px-6">
          <div className="relative min-w-0">
              <Filter size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-30 appearance-none rounded-lg border border-border bg-surface2 py-1.5 pl-6 pr-6 text-xs text-primary focus:border-accent/40 focus:outline-none "
              >
                <option value="">All modules</option>
                {modules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            

            <button
              onClick={exportMarkdown}
              disabled={messages.length === 0}
              aria-label="Export conversation as Markdown"
              title="Export as Markdown"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-primary disabled:opacity-30"
            >
              <Download size={15} />
            </button>
            <button
              onClick={shareConversation}
              disabled={!conversationId}
              aria-label="Copy shareable link"
              title="Copy shareable link"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-primary disabled:opacity-30"
            >
              {shareState === "copied" ? <Check size={15} className="text-emerald-400" /> : <Share2 size={15} />}
            </button>
            <a
              href="/admin"
              title="Ingestion dashboard"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-primary"
            >
              <LayoutDashboard size={15} />
            </a>

            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {messages.length === 0 && (
              <div className="mt-20 text-center">
                <p className="font-display text-lg text-primary">Ask anything about the Expo and React Native Course</p>
                <p className="mt-2 text-sm text-muted">
                  Answers cite the exact lesson and timestamp they came from — click a source to jump right to it.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                message={m}
                onSourceClick={handleSourceClick}
                onFollowupClick={send}
                onFeedback={m.id ? (value) => handleFeedback(i, value) : undefined}
                onRegenerate={
                  !busy && i === messages.length - 1 && m.role === "assistant" && !m.blocked
                    ? regenerate
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-2xl px-4 pb-6 sm:px-8">
          {moduleFilter && (
            <p className="mb-2 text-center text-xs text-muted">
              Scoped to <span className="text-primary">{moduleFilter}</span> —{" "}
              <button onClick={() => setModuleFilter("")} className="underline hover:text-primary">
                clear filter
              </button>
            </p>
          )}
          <ChatInput onSend={send} disabled={busy} />
        </div>
      </div>

      <LessonPlayer playback={playback} onClose={() => setPlayback(null)} />
    </main>
  );
}