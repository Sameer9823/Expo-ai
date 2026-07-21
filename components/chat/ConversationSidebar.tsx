// ConversationSidebar.tsx
"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Search, Menu, X } from "lucide-react";

export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export function ConversationSidebar({
  activeId,
  onSelect,
  onNew,
  refreshKey,
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshKey: number;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const url = query.trim()
      ? `/api/conversations?q=${encodeURIComponent(query.trim())}`
      : "/api/conversations";

    const t = setTimeout(() => {
      fetch(url, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setConversations(d.conversations ?? []))
        .catch(() => {});
    }, query ? 250 : 0);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, refreshKey]);

  const select = (id: string) => {
    onSelect(id);
    setMobileOpen(false);
  };

  const startNew = () => {
    onNew();
    setMobileOpen(false);
  };

  const remove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((c) => c.filter((x) => x.id !== id));
    if (activeId === id) onNew();
  };

  const body = (
    <>
      <div className="border-b border-border p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-lg font-bold text-primary">
            Expo<span className="text-accent">.</span>search
          </span>

          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-surface2 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <button
          onClick={startNew}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-base font-medium"
        >
          <Plus size={16} />
          New Chat
        </button>

        <div className="relative mt-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="h-11 w-full rounded-xl border border-border bg-surface2 pl-10 pr-4 text-sm focus:border-accent/40 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {conversations.length === 0 ? (
          <p className="pt-6 text-center text-sm text-muted">
            {query ? "No matching conversations." : "No conversations yet."}
          </p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => select(c.id)}
              className={`group flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 transition ${
                activeId === c.id
                  ? "bg-surface2 text-primary"
                  : "text-muted hover:bg-surface2"
              }`}
            >
              <span className="mr-3 flex-1 truncate text-sm">{c.title}</span>

              <button
                onClick={(e) => remove(c.id, e)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-red-500"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );

  return (
    <>
      <div className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-surface2"
        >
          <Menu size={20} />
        </button>

        <span className="truncate text-sm font-medium">
          {conversations.find((c) => c.id === activeId)?.title ?? "New Chat"}
        </span>
      </div>

      <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-border bg-surface md:flex">
        {body}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute inset-y-0 left-0 flex w-[90vw] max-w-[320px] flex-col border-r border-border bg-surface shadow-2xl animate-fadeUp">
            {body}
          </aside>
        </div>
      )}
    </>
  );
}
