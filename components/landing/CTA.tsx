import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";

export function CTA() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-10 text-center sm:px-8 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(255,130,88,0.14),transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/2 -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-termAmber/10 blur-3xl"
        />
        <h2 className="font-display text-xl font-bold text-primary sm:text-2xl md:text-3xl">
          Stop scrubbing through video.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          Sign in and ask your first question — the answer will tell you
          exactly where to look.
        </p>
        <Link
          href="/sign-up"
          className="group mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-[#ff8258] px-5 py-2.5 font-mono text-sm font-medium text-base shadow-lg shadow-accent/20 transition-all duration-300 hover:shadow-xl hover:shadow-accent/40 hover:brightness-110"
        >
          <span className="opacity-70">$</span> npx expo-search start
          <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/60 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center font-mono text-xs text-muted sm:flex-row sm:justify-between sm:gap-0 sm:text-left">
        <span className="text-primary/80">
          Expo<span className="text-accent">.</span>search
        </span>
        <a
          href="https://github.com/Sameer9823/Expo-ai"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 transition-colors hover:text-primary"
        >
          <Github size={13} className="transition-transform duration-300 group-hover:scale-110" />
          GitHub
        </a>
        <span>&copy; {new Date().getFullYear()} Sameer Selokar</span>
      </div>
    </footer>
  );
}