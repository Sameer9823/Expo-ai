import { Clock, PlayCircle } from "lucide-react";

export type Source = {
  module: string;
  lesson: string;
  timestamp: string;
  startTime?: number;
};

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

  return (
    <button
      type="button"
      onClick={() => onClick?.(source)}
      disabled={!clickable}
      className={`group flex w-full items-center gap-2 rounded-lg border border-border bg-surface2 px-3 py-2 text-left transition-colors ${
        clickable ? "cursor-pointer hover:border-cite/60 hover:bg-surface2/80" : "cursor-default"
      } ${pending ? "animate-pulse" : ""}`}
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
      <span className="ml-auto shrink-0 font-mono text-xs text-cite">{source.timestamp}</span>
    </button>
  );
}