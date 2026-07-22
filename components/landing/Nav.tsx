"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 border-b backdrop-blur-lg transition-all duration-300 ${
        scrolled
          ? "border-border/80 bg-base/90 shadow-lg shadow-black/20"
          : "border-border/30 bg-base/50"
      }`}
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="group font-display text-sm font-bold text-primary">
          Expo
          <span className="bg-gradient-to-r from-accent to-termAmber bg-clip-text text-transparent">
            .
          </span>
          search
          <span
            className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[1px] bg-accent animate-blink"
            aria-hidden="true"
          />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link href="#how-it-works" className="group relative text-sm text-muted transition-colors hover:text-primary">
            How it works
            <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-accent to-termAmber transition-all duration-300 group-hover:w-full" />
          </Link>
          <Link href="/sign-in" className="group relative text-sm text-muted transition-colors hover:text-primary">
            Sign in
            <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-accent to-termAmber transition-all duration-300 group-hover:w-full" />
          </Link>
          <Link
            href="/sign-up"
            className="group inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-[#ff8258] px-3.5 py-1.5 text-sm font-medium text-base shadow-sm shadow-accent/20 transition-all duration-300 hover:shadow-md hover:shadow-accent/40 hover:brightness-110"
          >
            Get started
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-surface2 sm:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border/60 sm:hidden"
          >
            <div className="flex flex-col gap-1 px-4 pb-4 pt-2">
              <Link
                href="#how-it-works"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface2 hover:text-primary"
              >
                How it works
              </Link>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface2 hover:text-primary"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                onClick={() => setOpen(false)}
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-[#ff8258] px-3 py-2.5 text-center text-sm font-medium text-base"
              >
                Get started
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}