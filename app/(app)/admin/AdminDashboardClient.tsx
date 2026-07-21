"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, PlayCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

type LessonRow = { module: string; lesson: string; hasSubtitles: boolean };

export function AdminDashboardClient() {
  const [stats, setStats] = useState<{
    totalLessons: number;
    lessonsWithSubtitles: number;
    indexedChunks: number | null;
    qdrantError: string | null;
    lessons: LessonRow[];
  } | null>(null);

  const [preview, setPreview] = useState<{ lesson: string; chunkCount: number; chunks: any[] } | null>(null);
  const [ingestLog, setIngestLog] = useState<string>("");
  const [ingesting, setIngesting] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  const loadStats = () => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  };

  useEffect(loadStats, []);

  const previewLesson = async (row: LessonRow) => {
    const res = await fetch(`/api/admin/preview?module=${encodeURIComponent(row.module)}&lesson=${encodeURIComponent(row.lesson)}`);
    const data = await res.json();
    if (res.ok) setPreview({ lesson: `${row.module} / ${row.lesson}`, chunkCount: data.chunkCount, chunks: data.chunks });
  };

  const runIngest = async () => {
    setIngesting(true);
    setIngestLog("");
    try {
      const res = await fetch("/api/admin/ingest", { method: "POST" });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          const { line: text } = JSON.parse(line);
          setIngestLog((l) => l + text);
          requestAnimationFrame(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }));
        }
      }
    } finally {
      setIngesting(false);
      loadStats();
    }
  };

  return (
    <main className="min-h-screen bg-base px-4 py-8 text-primary sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/chat" className="mb-2 inline-flex items-center gap-1 text-xs text-muted hover:text-primary">
              <ArrowLeft size={12} /> Back to chat
            </Link>
            <h1 className="font-display text-xl font-bold">Ingestion dashboard</h1>
          </div>
          <button
            onClick={loadStats}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface2 hover:text-primary"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Lessons on disk</p>
            <p className="mt-1 font-display text-2xl">{stats?.totalLessons ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">With subtitles</p>
            <p className="mt-1 font-display text-2xl">{stats?.lessonsWithSubtitles ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Chunks indexed in Qdrant</p>
            <p className="mt-1 font-display text-2xl">
              {stats?.qdrantError ? (
                <span className="flex items-center gap-1.5 text-sm text-accent">
                  <AlertTriangle size={16} /> unreachable
                </span>
              ) : (
                stats?.indexedChunks ?? "—"
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Re-run ingestion</h2>
            <button
              onClick={runIngest}
              disabled={ingesting}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-base disabled:opacity-50"
            >
              <PlayCircle size={13} /> {ingesting ? "Running..." : "Run npm run ingest"}
            </button>
          </div>
          {(ingestLog || ingesting) && (
            <pre
              ref={logRef}
              className="max-h-64 overflow-y-auto rounded-lg bg-black/60 p-3 font-mono text-[11px] text-muted"
            >
              {ingestLog || "Starting..."}
            </pre>
          )}
          <p className="mt-2 text-[11px] text-muted">
            Requires <code className="text-cite">OPENAI_API_KEY</code> and <code className="text-cite">QDRANT_URL</code>{" "}
            to be configured on the server. Restrict access via <code className="text-cite">ADMIN_USER_IDS</code>.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-medium">Lessons &amp; chunk preview</h2>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface text-muted">
                <tr>
                  <th className="py-1.5 pr-2 font-medium">Module</th>
                  <th className="py-1.5 pr-2 font-medium">Lesson</th>
                  <th className="py-1.5 pr-2 font-medium">Subtitles</th>
                  <th className="py-1.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {stats?.lessons.map((row, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="py-1.5 pr-2 text-muted">{row.module}</td>
                    <td className="py-1.5 pr-2">{row.lesson}</td>
                    <td className="py-1.5 pr-2">
                      {row.hasSubtitles ? (
                        <CheckCircle2 size={13} className="text-emerald-400" />
                      ) : (
                        <AlertTriangle size={13} className="text-accent" />
                      )}
                    </td>
                    <td className="py-1.5">
                      {row.hasSubtitles && (
                        <button onClick={() => previewLesson(row)} className="text-cite hover:underline">
                          Preview chunks
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {preview && (
          <div className="mt-6 rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-2 text-sm font-medium">
              Preview: {preview.lesson} <span className="text-muted">({preview.chunkCount} chunks)</span>
            </h2>
            <div className="flex flex-col gap-2">
              {preview.chunks.map((c, i) => (
                <div key={i} className="rounded-lg border border-border/60 bg-surface2 p-2 text-xs">
                  <p className="font-mono text-cite">{c.timestamp}</p>
                  <p className="mt-1 text-muted">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}