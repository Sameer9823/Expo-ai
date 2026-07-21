"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

type Cue = {
  question: string;
  lesson: string;
  timestamp: string;
};

const CUES: Cue[] = [
  {
    question: "What is a temporal dead zone?",
    lesson: "Module 13 · Auth in Expo",
    timestamp: "04:12",
  },
  {
    question: "How do I configure EAS builds?",
    lesson: "Module 10 · EAS Build",
    timestamp: "02:41",
  },
  {
    question: "Difference between React Native and Expo?",
    lesson: "Module 1 · Getting started",
    timestamp: "01:08",
  },
  {
    question: "How does Google OAuth work here?",
    lesson: "Module 13 · Google OAuth",
    timestamp: "06:35",
  },
];

export function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % CUES.length);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  const cue = CUES[index];

  return (
    <section className="relative mx-auto max-w-5xl px-4 pt-20 pb-14 sm:px-6 sm:pt-36 sm:pb-20">
      <div className="mb-6 flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-center text-[11px] text-muted font-mono sm:text-xs">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          GenAI with JS · Advanced RAG Patterns
        </span>
      </div>

      <h1 className="text-center font-display text-3xl font-bold leading-[1.15] text-primary sm:text-4xl sm:leading-[1.1] md:text-6xl">
        Ask your course anything.
        <br />
        <span className="text-accent">Get the exact moment</span> it was
        taught.
      </h1>

      <p className="mx-auto mt-5 max-w-xl text-center text-sm text-muted sm:mt-6 sm:text-base md:text-lg">
        Every answer is grounded in your course subtitles and cites the
        lesson name and timestamp it came from — no more scrubbing through
        hours of video.
      </p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/sign-up"
          className="rounded-lg bg-accent px-5 py-2.5 text-center text-sm font-medium text-base transition-colors hover:bg-[#ff8258]"
        >
          Start asking questions
        </Link>
        <Link
          href="/sign-in"
          className="rounded-lg border border-border px-5 py-2.5 text-center text-sm font-medium text-primary transition-colors hover:border-muted"
        >
          Sign in
        </Link>
      </div>

      {/* Signature element: subtitle scrubber */}
      <div className="mx-auto mt-10 max-w-2xl sm:mt-16">
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between font-mono text-[11px] text-muted sm:text-xs">
            <span className="truncate">Expo-search.mp4</span>
            <span className="shrink-0">{cue.timestamp}</span>
          </div>

          {/* Track */}
          <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
            <motion.div
              key={index}
              className="absolute top-0 h-full rounded-full bg-accent"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 4.2, ease: "linear" }}
            />
          </div>

          {/* Caption area */}
          <div className="mt-6 flex min-h-[92px] flex-col items-center justify-center text-center sm:mt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
              >
                <p className="font-display text-base text-primary sm:text-lg md:text-xl">
                  &ldquo;{cue.question}&rdquo;
                </p>
                <p className="mt-3 break-words font-mono text-[11px] text-cite sm:text-xs">
                  {cue.lesson} · {cue.timestamp}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}