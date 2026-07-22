"use client";

import { motion } from "framer-motion";
import { Quote, Wand2, ShieldCheck, ShieldAlert, type LucideIcon } from "lucide-react";

type Feature = {
  tag: string;
  title: string;
  body: string;
  icon: LucideIcon;
  glow: string;
};

const FEATURES: Feature[] = [
  {
    tag: "cited",
    title: "Cited to the second",
    body: "Every answer points to the exact lesson and timestamp, so you can jump straight to the source video.",
    icon: Quote,
    glow: "from-accent/25",
  },
  {
    tag: "query-rewrite",
    title: "Understands vague questions",
    body: "Broad or fuzzy questions get rewritten and broken down automatically to find what you actually meant.",
    icon: Wand2,
    glow: "from-cite/25",
  },
  {
    tag: "self-check",
    title: "Self-checks its answers",
    body: "Low-quality responses are caught and retried before they ever reach you.",
    icon: ShieldCheck,
    glow: "from-emerald-500/25",
  },
  {
    tag: "guardrails",
    title: "Guarded by design",
    body: "Off-topic or unsafe input is filtered before it reaches the model, both in and out.",
    icon: ShieldAlert,
    glow: "from-termAmber/25",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="font-display text-xl font-bold text-primary sm:text-2xl md:text-3xl"
      >
        Built on advanced RAG, not keyword search
      </motion.h2>
      <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:mt-10 sm:grid-cols-2">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="group relative overflow-hidden bg-surface p-5 transition-colors duration-300 hover:bg-surface/80 sm:p-6"
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${f.glow} to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
              />
              <div className="relative flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface2 text-accent transition-colors duration-300 group-hover:border-accent/40">
                  <Icon size={14} />
                </span>
                <p className="font-mono text-[11px] text-termAmber">
                  <span className="text-muted">// </span>
                  {f.tag}
                </p>
              </div>
              <h3 className="relative mt-3 font-display text-base font-medium text-primary">
                {f.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}