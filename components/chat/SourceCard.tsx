import { useState } from "react";
import { ChevronDown, Clock, PlayCircle, Quote } from "lucide-react";

export type Source = {
  module: string;
  lesson: string;
  timestamp: string;
  startTime?: number;
  /** The transcript excerpt this source was drawn from, shown when the time badge is expanded. */
  text?: string;
};

const TRANSCRIPT_PREVIEW_CHARS = 220;

export function SourceCard({
  source,
  onClick,
  pending,
}: {
  source: Source;
  onClick?: (source: Source) => void;
  pending?: boolean;
}) {
  const clickable = Boolean(onClick);
  const hasTranscript = Boolean(source.text);
  const [expanded, setExpanded] = useState(false);
  const [fullText, setFullText] = useState(false);

  const text = source.text ?? "";
  const isLong = text.length > TRANSCRIPT_PREVIEW_CHARS;
  const shownText = isLong && !fullText ? `${text.slice(0, TRANSCRIPT_PREVIEW_CHARS).trimEnd()}…` : text;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-border bg-surface2 transition-colors ${
        pending ? "animate-pulse" : ""
      }`}
    >
      <div className="flex w-full items-center gap-2 px-3 py-2 text-left">
        <button
          type="button"
          onClick={() => onClick?.(source)}
          disabled={!clickable}
          className={`group flex min-w-0 flex-1 items-center gap-2 ${
            clickable ? "cursor-pointer" : "cursor-default"
          }`}
        >
          {clickable ? (
            <PlayCircle size={14} className="shrink-0 text-cite transition-transform group-hover:scale-110" />
          ) : (
            <Clock size={14} className="shrink-0 text-cite" />
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-primary">{source.lesson}</p>
            <p className="truncate text-[11px] text-muted">{source.module}</p>
          </div>
        </button>

        {hasTranscript ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide transcript excerpt" : "Show transcript excerpt"}
            title={expanded ? "Hide transcript excerpt" : "Show transcript excerpt"}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs text-cite transition-colors hover:bg-cite/10"
          >
            {source.timestamp}
            <ChevronDown
              size={12}
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        ) : (
          <span className="ml-auto shrink-0 font-mono text-xs text-cite">{source.timestamp}</span>
        )}
      </div>

      {hasTranscript && expanded && (
        <div className="animate-fadeUp border-t border-border bg-surface px-3 py-2">
          <div className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
            <Quote size={12} className="mt-0.5 shrink-0 text-cite" />
            <p className="italic">{shownText}</p>
          </div>
          {isLong && (
            <button
              type="button"
              onClick={() => setFullText((f) => !f)}
              className="mt-1 pl-[18px] text-[11px] font-medium text-cite hover:underline"
            >
              {fullText ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}