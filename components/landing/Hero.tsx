"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check, Loader2, PlayCircle } from "lucide-react";

type StepStatus = "pending" | "running" | "done";

type Cue = {
  query: string;
  /** Mirrors the real stage labels emitted by lib/rag-pipeline.ts */
  steps: string[];
  answer: string;
  source: { lesson: string; timestamp: string };
  confidence: "High" | "Moderate";
};

const CUES: Cue[] = [
  {
    query: "How do I configure EAS builds?",
    steps: [
      "Checking your question",
      "Rewriting query for better search",
      "Searching course transcripts",
      "Generating answer",
    ],
    answer:
      "Run eas build:configure, then set your build profiles in eas.json before triggering a build.",
    source: { lesson: "Module 10 · EAS Build", timestamp: "02:41" },
    confidence: "High",
  },
  {
    query: "Difference between React Native and Expo?",
    steps: [
      "Checking your question",
      "Rewriting query for better search",
      "Searching course transcripts",
      "Generating answer",
    ],
    answer:
      "Expo is a framework and toolchain on top of React Native, adding managed builds, OTA updates, and a unified SDK.",
    source: { lesson: "Module 1 · Getting started", timestamp: "01:08" },
    confidence: "High",
  },
  {
    query: "How does Google OAuth work here?",
    steps: [
      "Checking your question",
      "Reading conversation context",
      "Searching course transcripts",
      "Generating answer",
    ],
    answer:
      "The app redirects to Google's consent screen, then exchanges the returned code for a session via AuthSession.",
    source: { lesson: "Module 13 · Google OAuth", timestamp: "06:35" },
    confidence: "Moderate",
  },
];

const CHAR_MS = 32;
const STEP_MS = 480;
const HOLD_MS = 2200;

function sleep(ms: number, signal: { cancelled: boolean }) {
  return new Promise<void>((resolve) => {
    const id = setTimeout(resolve, ms);
    if (signal.cancelled) clearTimeout(id);
  });
}

export function Hero() {
  const [cueIndex, setCueIndex] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showSource, setShowSource] = useState(false);

  const cancelledRef = useRef({ cancelled: false });

  useEffect(() => {
    const signal = { cancelled: false };
    cancelledRef.current = signal;

    async function run() {
      const cue = CUES[cueIndex];
      setTypedChars(0);
      setStepStatuses(cue.steps.map(() => "pending"));
      setShowAnswer(false);
      setShowSource(false);

      // Typewriter the query into the prompt line.
      for (let i = 1; i <= cue.query.length; i++) {
        if (signal.cancelled) return;
        setTypedChars(i);
        await sleep(CHAR_MS, signal);
      }
      await sleep(350, signal);

      // Walk each pipeline stage through running -> done.
      for (let i = 0; i < cue.steps.length; i++) {
        if (signal.cancelled) return;
        setStepStatuses((prev) => prev.map((s, idx) => (idx === i ? "running" : s)));
        await sleep(STEP_MS, signal);
        if (signal.cancelled) return;
        setStepStatuses((prev) => prev.map((s, idx) => (idx === i ? "done" : s)));
        await sleep(120, signal);
      }

      if (signal.cancelled) return;
      setShowAnswer(true);
      await sleep(500, signal);
      if (signal.cancelled) return;
      setShowSource(true);

      await sleep(HOLD_MS, signal);
      if (signal.cancelled) return;
      setCueIndex((i) => (i + 1) % CUES.length);
    }

    run();
    return () => {
      signal.cancelled = true;
    };
  }, [cueIndex]);

  const cue = CUES[cueIndex];
  const typedQuery = cue.query.slice(0, typedChars);
  const isTyping = typedChars < cue.query.length;

  return (
    <section className="relative mx-auto max-w-5xl overflow-hidden px-4 pt-8 pb-14 sm:px-6 sm:pt-36 sm:pb-20">
      {/* Ambient gradient orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 -z-10 h-72 w-72 rounded-full bg-accent/20 blur-[100px]"
        animate={{ y: [0, 24, 0], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-24 -z-10 h-72 w-72 rounded-full bg-cite/15 blur-[100px]"
        animate={{ y: [0, -20, 0], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Dot-grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148,163,184,0.35) 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 25%, black 60%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 70% at 50% 25%, black 60%, transparent 100%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 flex justify-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-center text-[11px] text-muted font-mono sm:text-xs">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          GenAI with JS · Advanced RAG Patterns
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1 }}
        className="text-center font-display text-3xl font-bold leading-[1.15] text-primary sm:text-4xl sm:leading-[1.1] md:text-6xl"
      >
        Ask your course anything.
        <br />
        <span className="bg-gradient-to-r from-accent via-[#ff9466] to-termAmber bg-clip-text text-transparent">
          Get the exact moment
        </span>{" "}
        it was taught.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.2 }}
        className="mx-auto mt-5 max-w-xl text-center text-sm text-muted sm:mt-6 sm:text-base md:text-lg"
      >
        Every answer is grounded in your course subtitles and cites the
        lesson name and timestamp it came from — no more scrubbing through
        hours of video.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.3 }}
        className="mt-4 flex flex-col justify-center gap-3 sm:flex-row"
      >
        <Link
          href="/sign-up"
          className="group inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-[#ff8258] px-5 py-2.5 text-center text-sm font-medium text-base shadow-lg shadow-accent/20 transition-all duration-300 hover:shadow-xl hover:shadow-accent/40 hover:brightness-110"
        >
          Start asking questions
          <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/sign-in"
          className="rounded-lg border border-border px-5 py-2.5 text-center text-sm font-medium text-primary transition-colors hover:border-muted hover:bg-surface"
        >
          Sign in
        </Link>
      </motion.div>

    </section>
  );
}