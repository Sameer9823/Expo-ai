"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, RotateCcw, Volume2, Square, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { SourceCard, Source } from "./SourceCard";

export type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  sourcesPending?: boolean; // true while sources are streaming in but the answer isn't final yet
  followups?: string[];
  confidence?: number;
  feedback?: 1 | -1 | null;
  status?: string;
  blocked?: boolean;
};

function ConfidenceBadge({ score }: { score: number }) {
  const tier =
    score >= 8
      ? { label: "High confidence", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" }
      : score >= 5
      ? { label: "Moderate confidence", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" }
      : { label: "Check the source", className: "bg-rose-500/10 text-rose-400 border-rose-500/30" };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tier.className}`}
      title={`Corrective-loop grounding score: ${score}/10`}
    >
      <Sparkles size={11} /> {tier.label}
    </span>
  );
}

export function MessageBubble({
  message,
  onRegenerate,
  onSourceClick,
  onFollowupClick,
  onFeedback,
}: {
  message: ChatMessage;
  onRegenerate?: () => void;
  onSourceClick?: (source: Source) => void;
  onFollowupClick?: (question: string) => void;
  onFeedback?: (value: 1 | -1) => void;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleSpeak = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <div className={`flex animate-fadeUp ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] sm:max-w-2xl ${isUser ? "" : "w-full"}`}>
        <div
          className={
            isUser
              ? "rounded-2xl bg-gradient-to-br from-surface2 to-surface2/70 px-3.5 py-2.5 text-sm text-primary shadow-sm sm:px-4"
              : "rounded-2xl border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed text-primary shadow-sm sm:px-4"
          }
        >
          {message.blocked ? (
            <p className="text-sm text-accent">{message.content}</p>
          ) : message.content ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="flex items-center gap-2 font-mono text-xs text-muted">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
              </span>
              {message.status ?? "Thinking..."}
            </p>
          )}
        </div>

        {!isUser && message.content && !message.blocked && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {typeof message.confidence === "number" && <ConfidenceBadge score={message.confidence} />}
            <button
              onClick={copy}
              aria-label="Copy response"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface2 hover:text-primary"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            <button
              onClick={toggleSpeak}
              aria-label={speaking ? "Stop reading aloud" : "Read aloud"}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface2 hover:text-primary"
            >
              {speaking ? <Square size={13} /> : <Volume2 size={13} />}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                aria-label="Regenerate response"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface2 hover:text-primary"
              >
                <RotateCcw size={13} />
              </button>
            )}
            {onFeedback && (
              <>
                <button
                  onClick={() => onFeedback(1)}
                  aria-label="Good answer"
                  className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-surface2 ${
                    message.feedback === 1 ? "text-emerald-400" : "text-muted hover:text-primary"
                  }`}
                >
                  <ThumbsUp size={13} />
                </button>
                <button
                  onClick={() => onFeedback(-1)}
                  aria-label="Bad answer"
                  className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-surface2 ${
                    message.feedback === -1 ? "text-rose-400" : "text-muted hover:text-primary"
                  }`}
                >
                  <ThumbsDown size={13} />
                </button>
              </>
            )}
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {message.sources.map((s, i) => (
              <SourceCard key={i} source={s} onClick={onSourceClick} pending={message.sourcesPending} />
            ))}
          </div>
        )}

        {!isUser && message.followups && message.followups.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.followups.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowupClick?.(q)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-primary"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}