// ConversationSidebar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Search,
  Menu,
  X,
  Pencil,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

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

  // Desktop collapse/expand — open by default, matches most chat-app defaults.
  const [collapsed, setCollapsed] = useState(false);

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const url = query.trim()
      ? `/api/conversations?q=${encodeURIComponent(query.trim())}`
      : "/api/conversations";

    const t = setTimeout(
      () => {
        fetch(url, { signal: controller.signal })
          .then((r) => r.json())
          .then((d) => setConversations(d.conversations ?? []))
          .catch(() => {});
      },
      query ? 250 : 0,
    );

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, refreshKey]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

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

  const startEdit = (c: ConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditValue(c.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (id: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }

    setConversations((cs) =>
      cs.map((c) => (c.id === id ? { ...c, title: trimmed } : c)),
    );
    setSavingEdit(true);
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
    } finally {
      setSavingEdit(false);
      cancelEdit();
    }
  };

  const handleEditKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    id: string,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const conversationList = (
    <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
      {conversations.length === 0 ? (
        <p className="pt-6 text-center text-sm text-muted">
          {query ? "No matching conversations." : "No conversations yet."}
        </p>
      ) : (
        conversations.map((c) => {
          const isEditing = editingId === c.id;
          return (
            <div
              key={c.id}
              onClick={() => !isEditing && select(c.id)}
              className={`group flex h-9 cursor-pointer items-center justify-between rounded-lg px-2.5 transition ${
                activeId === c.id
                  ? "bg-surface2 text-primary"
                  : "text-muted hover:bg-surface2"
              }`}
            >
              {isEditing ? (
                <input
                  ref={editInputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleEditKeyDown(e, c.id)}
                  onBlur={() => saveEdit(c.id)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={savingEdit}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="mr-2 flex-1 rounded-md border border-accent/50 bg-surface2 px-1.5 py-0.5 text-[13px] text-primary outline-none focus:outline-none"
                />
              ) : (
                <span className="mr-2 flex-1 truncate text-[13px]">
                  {c.title}
                </span>
              )}

              <div className="flex shrink-0 items-center gap-0.5">
                {isEditing ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveEdit(c.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-background hover:text-emerald-400"
                    title="Save"
                  >
                    <Check size={13} />
                  </button>
                ) : (
                  <button
                    onClick={(e) => startEdit(c, e)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted opacity-0 hover:bg-background hover:text-primary group-hover:opacity-100"
                    title="Rename"
                  >
                    <Pencil size={12} />
                  </button>
                )}

                <button
                  onClick={(e) => remove(c.id, e)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted opacity-0 hover:bg-background hover:text-red-500 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const body = (
    <>
      <div className="border-b border-border p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-lg font-bold text-primary">
            Expo<span className="text-accent">.</span>search
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed(true)}
              className="hidden h-10 w-10 items-center justify-center rounded-xl hover:bg-surface2 md:flex"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={18} />
            </button>

            <button
              onClick={() => setMobileOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-surface2 md:hidden"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <button
          onClick={startNew}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-base font-medium"
        >
          <Plus size={16} />
          New Chat
        </button>

        <div className="relative mt-4">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="h-11 w-full rounded-xl border border-border bg-surface2 pl-10 pr-4 text-sm focus:border-accent/40 focus:outline-none"
          />
        </div>
      </div>

      {conversationList}
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

      {collapsed ? (
        <aside className="hidden h-full w-16 shrink-0 flex-col items-center gap-3 border-r border-border bg-surface py-4 md:flex">
          <button
            onClick={() => setCollapsed(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-surface2"
            title="Expand sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>
          <button
            onClick={startNew}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-base"
            title="New Chat"
          >
            <Plus size={18} />
          </button>
        </aside>
      ) : (
        <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-border bg-surface md:flex">
          {body}
        </aside>
      )}

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
