"use client";

import { motion } from "framer-motion";
import { MessageSquare, FileSearch, Link2, type LucideIcon } from "lucide-react";

type Step = {
  n: string;
  title: string;
  body: string;
  icon: LucideIcon;
};

const STEPS: Step[] = [
  {
    n: "01",
    title: "Ask in plain language",
    body: "Type any question about the course — a concept, a bug, a step you missed.",
    icon: MessageSquare,
  },
  {
    n: "02",
    title: "We search every subtitle",
    body: "Your question is matched against the transcript of every lesson, not just keywords.",
    icon: FileSearch,
  },
  {
    n: "03",
    title: "Get the answer, and the source",
    body: "The response links straight back to the lesson name and the timestamp it came from.",
    icon: Link2,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="font-display text-xl font-bold text-primary sm:text-2xl md:text-3xl"
      >
        How it works
      </motion.h2>

      <div className="relative mt-10 grid gap-8 sm:mt-16 sm:grid-cols-3 sm:gap-8">
        <div
          aria-hidden
          className="absolute left-0 right-0 top-[22px] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent sm:block"
        />
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.12 }}
              className="relative flex gap-4 sm:flex-col"
            >
              <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent shadow-sm shadow-black/20">
                <Icon size={16} />
              </div>
              <div className="border-l border-border pl-4 sm:border-l-0 sm:pl-0">
                <span className="font-mono text-[11px] text-termAmber">{step.n}</span>
                <h3 className="mt-1 font-display text-base font-medium text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}