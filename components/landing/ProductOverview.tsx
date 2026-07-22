"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayCircle, Sparkles, ThumbsUp, Copy } from "lucide-react";

type Unit = { text: string; code?: boolean };
type Source = { lesson: string; module: string; timestamp: string };

type Pair = {
  question: string;
  answer: Unit[];
  sources: Source[];
};

// Splits a plain-text chunk into word-level render units so code
// snippets always reveal as a single unit instead of char-by-char.
function toUnits(parts: (string | { code: string })[]): Unit[] {
  const units: Unit[] = [];
  for (const part of parts) {
    if (typeof part === "string") {
      const words = part.split(" ").filter((w) => w.length > 0);
      words.forEach((w, i) => {
        units.push({ text: i < words.length ? w + " " : w });
      });
    } else {
      units.push({ text: part.code, code: true });
      units.push({ text: " " });
    }
  }
  return units;
}

const PAIRS: Pair[] = [
  {
    question: "How does Google OAuth work here?",
    answer: toUnits([
      "The course uses Clerk to broker Google OAuth — the redirect is configured in ",
      { code: "middleware.ts" },
      ", and the callback exchanges the code for a session token before routing back into ",
      { code: "/chat" },
      ".",
    ]),
    sources: [
      { lesson: "Auth in Expo · Part 2", module: "Module 13", timestamp: "04:12" },
      { lesson: "Google OAuth setup", module: "Module 13", timestamp: "06:35" },
    ],
  },
  {
    question: "How do I configure EAS builds?",
    answer: toUnits([
      "EAS builds are driven by ",
      { code: "eas.json" },
      " — define a profile per environment, then run ",
      { code: "eas build --profile preview" },
      " to generate a shareable install link.",
    ]),
    sources: [
      { lesson: "EAS Build basics", module: "Module 10", timestamp: "02:41" },
      { lesson: "Build profiles & environments", module: "Module 10", timestamp: "09:03" },
    ],
  },
  {
    question: "Difference between React Native and Expo?",
    answer: toUnits([
      "React Native is the framework; Expo is a layer of tools and managed services on top of it — OTA updates, config plugins, and ",
      { code: "eas build" },
      " / ",
      { code: "eas submit" },
      " for shipping to stores.",
    ]),
    sources: [
      { lesson: "Getting started", module: "Module 1", timestamp: "01:08" },
      { lesson: "Expo vs bare React Native", module: "Module 1", timestamp: "05:47" },
    ],
  },
];

const TYPE_MS = 28;
const THINK_MS = 850;
const WORD_MS = 70;
const SOURCE_GAP_MS = 220;
const HOLD_MS = 2400;
const RESET_MS = 350;

type Phase = "typing" | "thinking" | "streaming" | "sources" | "holding" | "resetting";

export function ProductPreview() {
  const [pairIndex, setPairIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typedLen, setTypedLen] = useState(0);
  const [revealedUnits, setRevealedUnits] = useState(0);
  const [visibleSources, setVisibleSources] = useState(0);

  // One infinite loop drives the whole sequence. Using a single effect
  // (instead of several effects reacting to each other's state) avoids
  // cleanup-vs-timer races that could stall the animation partway through.
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, ms);
      });

    async function run() {
      let idx = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const current = PAIRS[idx % PAIRS.length];

        setPairIndex(idx % PAIRS.length);
        setPhase("typing");
        setTypedLen(0);
        setRevealedUnits(0);
        setVisibleSources(0);

        await wait(400);
        if (cancelled) return;

        for (let c = 1; c <= current.question.length; c++) {
          await wait(TYPE_MS);
          if (cancelled) return;
          setTypedLen(c);
        }

        await wait(300);
        if (cancelled) return;
        setPhase("thinking");

        await wait(THINK_MS);
        if (cancelled) return;
        setPhase("streaming");

        for (let u = 1; u <= current.answer.length; u++) {
          await wait(WORD_MS);
          if (cancelled) return;
          setRevealedUnits(u);
        }

        await wait(250);
        if (cancelled) return;
        setPhase("sources");

        for (let s = 1; s <= current.sources.length; s++) {
          await wait(SOURCE_GAP_MS);
          if (cancelled) return;
          setVisibleSources(s);
        }

        await wait(HOLD_MS);
        if (cancelled) return;
        setPhase("holding");

        await wait(RESET_MS);
        if (cancelled) return;
        setPhase("resetting");

        await wait(RESET_MS);
        if (cancelled) return;

        idx += 1;
      }
    }

    run();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const pair = PAIRS[pairIndex];
  const answerVisible =
    phase === "streaming" || phase === "sources" || phase === "holding" || phase === "resetting";
  const sourcesVisible = phase === "sources" || phase === "holding" || phase === "resetting";
  const contentFading = phase === "resetting";

  return (
    <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mb-8 sm:mb-10"
      >
        <p className="font-mono text-[11px] text-termAmber">
          <span className="text-muted">// </span>see it in action
        </p>
        <h2 className="mt-2 font-display text-xl font-bold text-primary sm:text-2xl md:text-3xl">
          A real answer, cited in real time
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-accent/10 via-cite/5 to-termAmber/10 opacity-80 blur-3xl"
        />
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-border bg-surface2/60 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 truncate rounded-md bg-surface px-3 py-1 font-mono text-[11px] text-muted">
              expo.search/chat
            </span>
            <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-muted sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              live preview
            </span>
          </div>

          <div className="grid gap-0 sm:grid-cols-[200px_1fr]">
            {/* Fake sidebar */}
            <div className="hidden border-r border-border p-4 sm:block">
              <div className="mb-4 rounded-lg border border-dashed border-border px-3 py-2 text-center text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-primary">
                + New chat
              </div>
              <div className="space-y-1.5">
                {PAIRS.map((p, i) => (
                  <div
                    key={p.question}
                    className={`truncate rounded-lg px-3 py-2 text-xs transition-colors duration-300 ${
                      i === pairIndex ? "bg-surface2 text-primary" : "text-muted"
                    }`}
                  >
                    {p.question}
                  </div>
                ))}
              </div>
            </div>

            {/* Fake chat pane */}
            <div className="min-h-[300px] p-5 sm:p-6">
              <AnimatePresence mode="wait">
                {!contentFading && (
                  <motion.div
                    key={pairIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* user message, typing */}
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-surface2 px-4 py-2.5 text-sm text-primary">
                        {pair.question.slice(0, typedLen)}
                        {phase === "typing" && (
                          <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-primary align-middle" />
                        )}
                      </div>
                    </div>

                    {/* assistant message */}
                    <div className="mt-4 min-h-[140px]">
                      {phase === "thinking" && (
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15">
                            <Sparkles size={12} className="text-accent" />
                          </span>
                          <span className="flex items-center gap-1">
                            {[0, 1, 2].map((d) => (
                              <span
                                key={d}
                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
                                style={{ animationDelay: `${d * 120}ms` }}
                              />
                            ))}
                          </span>
                        </div>
                      )}

                      {answerVisible && (
                        <>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15">
                              <Sparkles size={12} className="text-accent" />
                            </span>
                            {phase !== "streaming" && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400"
                              >
                                <Sparkles size={11} /> High confidence
                              </motion.span>
                            )}
                          </div>

                          <p className="max-w-xl text-sm leading-relaxed text-primary">
                            {pair.answer.slice(0, revealedUnits).map((u, i) =>
                              u.code ? (
                                <code
                                  key={i}
                                  className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[13px] text-accent"
                                >
                                  {u.text}
                                </code>
                              ) : (
                                <span key={i}>{u.text}</span>
                              )
                            )}
                            {phase === "streaming" && (
                              <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-accent align-middle" />
                            )}
                          </p>

                          {/* source cards */}
                          {sourcesVisible && (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {pair.sources.slice(0, visibleSources).map((s) => (
                                <motion.div
                                  key={s.lesson}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="group flex items-center gap-2 rounded-lg border border-border bg-surface2 px-3 py-2 transition-colors hover:border-cite/40"
                                >
                                  <PlayCircle
                                    size={14}
                                    className="shrink-0 text-cite transition-transform group-hover:scale-110"
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-medium text-primary">
                                      {s.lesson}
                                    </p>
                                    <p className="truncate text-[11px] text-muted">
                                      {s.module}
                                    </p>
                                  </div>
                                  <span className="ml-auto shrink-0 font-mono text-xs text-cite">
                                    {s.timestamp}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          )}

                          {sourcesVisible && (
                            <div className="mt-3 flex items-center gap-3 text-muted">
                              <Copy size={13} className="cursor-default transition-colors hover:text-primary" />
                              <ThumbsUp size={13} className="cursor-default transition-colors hover:text-primary" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}