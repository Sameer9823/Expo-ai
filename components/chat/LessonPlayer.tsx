"use client";

import { useEffect, useRef, useState } from "react";
import { X, PlayCircle } from "lucide-react";
import { buildSeekUrl, isAudioFile } from "@/lib/media-utils";
import { Source } from "@/components/chat/SourceCard";

export type ActivePlayback = { source: Source; url: string | null };

export function LessonPlayer({
  playback,
  onClose,
}: {
  playback: ActivePlayback | null;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [key, setKey] = useState(0); // forces iframe reload on re-seek

  useEffect(() => {
    setKey((k) => k + 1);
    if (!playback?.url) return;
    const startTime = playback.source.startTime ?? 0;
    // Native elements can seek in place without a reload.
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play().catch(() => {});
    }
    if (audioRef.current) {
      audioRef.current.currentTime = startTime;
      audioRef.current.play().catch(() => {});
    }
  }, [playback]);

  if (!playback) return null;

  const { source, url } = playback;
  const startTime = source.startTime ?? 0;
  const resolved = url ? buildSeekUrl(url, startTime) : null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto w-auto max-w-[380px] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-fadeUp sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[min(92vw,380px)]">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-primary">{source.lesson}</p>
          <p className="truncate text-[11px] text-muted">
            {source.module} · <span className="font-mono text-cite">{source.timestamp}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close player"
          className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface2 hover:text-primary"
        >
          <X size={14} />
        </button>
      </div>

      <div className="bg-black">
        {!resolved ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
            <PlayCircle size={22} className="text-muted" />
            <p className="text-xs text-muted">
              No video source configured for this lesson yet. Add an entry to{" "}
              <code className="text-cite">data/media-map.json</code> to enable playback at{" "}
              <span className="font-mono text-primary">{source.timestamp}</span>.
            </p>
          </div>
        ) : resolved.kind === "youtube" || resolved.kind === "vimeo" ? (
          <iframe
            key={key}
            src={resolved.src}
            className="aspect-video w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : isAudioFile(resolved.src) ? (
          <div className="flex h-24 items-center bg-surface2 px-3">
            <audio ref={audioRef} src={resolved.src} controls className="w-full" />
          </div>
        ) : (
          <video ref={videoRef} src={resolved.src} controls className="aspect-video w-full bg-black" />
        )}
      </div>
    </div>
  );
}