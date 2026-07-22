"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  UploadCloud,
  FolderUp,
  FileText,
  X,
} from "lucide-react";

type LessonRow = { module: string; lesson: string; hasSubtitles: boolean };

// Lets TS accept the non-standard `webkitdirectory` attribute on a file input.
declare module "react" {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

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

  // --- "Add transcripts" panel state ---
  const [uploadMode, setUploadMode] = useState<"single" | "folder">("single");
  const [moduleName, setModuleName] = useState("");
  const [lessonName, setLessonName] = useState("");
  const [singleFiles, setSingleFiles] = useState<File[]>([]);
  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  const [uploadLog, setUploadLog] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const uploadLogRef = useRef<HTMLPreElement>(null);

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

  /** Streams a text/event-stream response into the given setter, line by line. */
  const streamLog = async (
    res: Response,
    setLog: React.Dispatch<React.SetStateAction<string>>,
    logEl: HTMLPreElement | null
  ) => {
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
        setLog((l) => l + text);
        requestAnimationFrame(() => logEl?.scrollTo({ top: logEl.scrollHeight }));
      }
    }
  };

  const runIngest = async () => {
    setIngesting(true);
    setIngestLog("");
    try {
      const res = await fetch("/api/admin/ingest", { method: "POST" });
      await streamLog(res, setIngestLog, logRef.current);
    } finally {
      setIngesting(false);
      loadStats();
    }
  };

  const filesFromFileList = (fileList: FileList | null): File[] => (fileList ? Array.from(fileList) : []);

  const runUpload = async () => {
    const filesToSend = uploadMode === "single" ? singleFiles : folderFiles;
    if (filesToSend.length === 0) return;
    if (uploadMode === "single" && (!moduleName.trim() || !lessonName.trim())) return;

    setUploading(true);
    setUploadLog("");
    try {
      const formData = new FormData();
      formData.set("mode", uploadMode);
      if (uploadMode === "single") {
        formData.set("module", moduleName.trim());
        formData.set("lesson", lessonName.trim());
        for (const f of filesToSend) formData.append("files", f);
      } else {
        for (const f of filesToSend) {
          formData.append("files", f);
          formData.append("paths", (f as any).webkitRelativePath || f.name);
        }
      }

      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      await streamLog(res, setUploadLog, uploadLogRef.current);

      if (res.ok) {
        setSingleFiles([]);
        setFolderFiles([]);
        setModuleName("");
        setLessonName("");
      }
    } finally {
      setUploading(false);
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
            <h2 className="text-sm font-medium">Add transcripts</h2>
            <div className="flex overflow-hidden rounded-lg border border-border text-xs">
              <button
                onClick={() => setUploadMode("single")}
                className={`px-2.5 py-1 ${uploadMode === "single" ? "bg-accent text-base" : "text-muted hover:bg-surface2"}`}
              >
                Single lesson
              </button>
              <button
                onClick={() => setUploadMode("folder")}
                className={`px-2.5 py-1 ${uploadMode === "folder" ? "bg-accent text-base" : "text-muted hover:bg-surface2"}`}
              >
                Whole folder
              </button>
            </div>
          </div>

          {uploadMode === "single" ? (
            <div className="flex flex-col gap-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Module (e.g. module 13)"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="rounded-lg border border-border bg-surface2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="Lesson (e.g. 04_new-lesson_epm)"
                  value={lessonName}
                  onChange={(e) => setLessonName(e.target.value)}
                  className="rounded-lg border border-border bg-surface2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted hover:border-accent hover:text-primary">
                <UploadCloud size={15} />
                Choose .srt / .vtt file(s)
                <input
                  type="file"
                  accept=".srt,.vtt"
                  multiple
                  className="hidden"
                  onChange={(e) => setSingleFiles(filesFromFileList(e.target.files))}
                />
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted hover:border-accent hover:text-primary">
                <FolderUp size={15} />
                Choose a course folder (module/lesson/*.srt structure)
                <input
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                  onChange={(e) => setFolderFiles(filesFromFileList(e.target.files))}
                />
              </label>
              <p className="text-[11px] text-muted">
                Files are matched to modules/lessons by their folder path. Non .srt/.vtt files in the folder are
                skipped automatically.
              </p>
            </div>
          )}

          {(singleFiles.length > 0 || folderFiles.length > 0) && (
            <div className="mt-2 flex flex-col gap-1">
              {(uploadMode === "single" ? singleFiles : folderFiles)
                .filter((f) => uploadMode === "single" || f.name.endsWith(".srt") || f.name.endsWith(".vtt"))
                .slice(0, 12)
                .map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted">
                    <FileText size={11} />
                    <span className="truncate">{(f as any).webkitRelativePath || f.name}</span>
                  </div>
                ))}
              {(uploadMode === "single" ? singleFiles : folderFiles).length > 12 && (
                <p className="text-[11px] text-muted">
                  +{(uploadMode === "single" ? singleFiles : folderFiles).length - 12} more
                </p>
              )}
              <button
                onClick={() => (uploadMode === "single" ? setSingleFiles([]) : setFolderFiles([]))}
                className="mt-1 flex w-fit items-center gap-1 text-[11px] text-muted hover:text-primary"
              >
                <X size={11} /> Clear selection
              </button>
            </div>
          )}

          <button
            onClick={runUpload}
            disabled={
              uploading ||
              (uploadMode === "single" ? singleFiles.length === 0 : folderFiles.length === 0) ||
              (uploadMode === "single" && (!moduleName.trim() || !lessonName.trim()))
            }
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-base disabled:opacity-50"
          >
            <UploadCloud size={13} /> {uploading ? "Uploading & indexing..." : "Upload & index"}
          </button>

          {(uploadLog || uploading) && (
            <pre
              ref={uploadLogRef}
              className="mt-3 max-h-64 overflow-y-auto rounded-lg bg-black/60 p-3 font-mono text-[11px] text-muted"
            >
              {uploadLog || "Starting..."}
            </pre>
          )}

          <p className="mt-2 text-[11px] text-muted">
            This only embeds and upserts the lesson(s) you just added — the rest of the Qdrant index is left as-is,
            unlike "Re-run ingestion" below which rebuilds everything from scratch.
          </p>
        </div>

        {/* <div className="mt-6 rounded-xl border border-border bg-surface p-4">
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
        </div> */}

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